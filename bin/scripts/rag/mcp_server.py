"""Stdio MCP server exposing the ink-ops memory bank as agent-callable tools.

Retrieval (ADR-0015): hybrid search — dense (bge-m3) + sparse (BM25) fused with
RRF — followed by parent-document expansion: instead of the raw chunk, results
return the chunk's owning H1/H2 section read fresh from disk (deduplicated per
section), falling back to the chunk snippet when the file changed or moved.

    memory_search(query, ...)  -> top-k parent sections (breadcrumb + score + text)
    memory_status()            -> collection point count by memory_type

Launched via .claude/settings.json (server name "ink-memory"). Run standalone for a
smoke test:

    ~/ink-ops-rag-venv/bin/python bin/scripts/rag/mcp_server.py
"""
import hashlib
import sys
from pathlib import Path

# Allow `import config` / `from ollama_client import ...` regardless of launch cwd.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from mcp.server.fastmcp import FastMCP

import config
from ollama_client import embed_query
from qdrant_client.models import FusionQuery, Fusion, Prefetch
from qdrant_store import DENSE, SPARSE, build_filter, get_client
from sparse import embed_sparse_query

_PREFETCH = 20  # candidates fetched per vector branch (dense/sparse) before RRF fusion

mcp = FastMCP("ink-memory")


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "turbo.json").exists():
            return parent
    return current.parents[3]


def hybrid_search(query: str, k: int, flt) -> list:
    """Dense+sparse prefetch fused with RRF. Returns scored points."""
    dense_vec = embed_query(query)
    try:
        sparse_vec = embed_sparse_query(query)
    except Exception:
        sparse_vec = None  # fastembed unavailable → dense-only degrade

    prefetch = [
        Prefetch(
            query=dense_vec,
            using=DENSE,
            filter=flt,
            limit=_PREFETCH,
            score_threshold=config.MIN_SCORE,
        )
    ]
    if sparse_vec is not None:
        prefetch.append(
            Prefetch(query=sparse_vec, using=SPARSE, filter=flt, limit=_PREFETCH)
        )

    return get_client().query_points(
        collection_name=config.COLLECTION,
        prefetch=prefetch,
        query=FusionQuery(fusion=Fusion.RRF),
        query_filter=flt,
        limit=max(k * 3, k),  # room for parent-level dedupe
        with_payload=True,
    ).points


def expand_parents(points: list, k: int) -> list[dict]:
    """Parent-document expansion: dedupe chunks by owning section and return
    the section text read fresh from disk (fallback: chunk snippet)."""
    root = _repo_root()
    out: list[dict] = []
    seen: set[tuple] = set()

    for p in points:
        payload = p.payload or {}
        key = (payload.get("parent_source"), payload.get("parent_section"))
        if key in seen:
            continue
        seen.add(key)

        text = None
        origin = "parent"
        src = payload.get("parent_source") or payload.get("source") or ""
        start = int(payload.get("parent_start") or 0)
        end = int(payload.get("parent_end") or 0)
        stored_hash = payload.get("parent_hash") or ""

        if src and end > start:
            try:
                raw = (root / src).read_text(encoding="utf-8", errors="ignore")
                slice_ = raw[start:end]
                if stored_hash:
                    ok = hashlib.sha256(slice_.encode("utf-8")).hexdigest() == stored_hash
                else:
                    ok = bool(slice_.strip())  # code chunks carry no hash
                if ok:
                    text = slice_.strip()
            except OSError:
                text = None

        if text is None:
            text = payload.get("text", "")
            origin = "chunk"

        if len(text) > config.PARENT_MAX_CHARS:
            text = text[: config.PARENT_MAX_CHARS] + " …"

        out.append(
            {
                "score": p.score,
                "memory_type": payload.get("memory_type", ""),
                "breadcrumb": payload.get("breadcrumb", ""),
                "parent_section": payload.get("parent_section", ""),
                "source": payload.get("source", ""),
                "origin": origin,
                "text": text,
            }
        )
        if len(out) >= k:
            break
    return out


@mcp.tool()
def memory_search(
    query: str,
    k: int = 5,
    memory_type: str | None = None,
    document: str | None = None,
    section: str | None = None,
    app: str | None = None,
    module: str | None = None,
    layer: str | None = None,
    include_code: bool = False,
) -> str:
    """Semantic search over the ink-ops memory bank (.memory/, docs/, package READMEs, CLAUDE.md — and, opt-in, the TypeScript source).

    Call this BEFORE reading source code to answer "where/how does X work" questions.
    Hybrid retrieval (semantic + BM25) with parent-document expansion: results are the
    owning SECTION of each matching chunk (more context than a bare snippet).

    Optional metadata filters scope the search (use them to cut noise):
      - memory_type: "adr", "doc", "architecture", "domain-rules", "project-overview",
        "roadmap", "recent-decisions", "package-readme", "claude", "code".
      - document: a specific doc id, e.g. "ADR-0015".
      - section: a specific section title, e.g. "Consequências".
      - app/module/layer: code filters, e.g. app="backend", module="audit",
        layer="application".
      - include_code: False by default — docs are the primary recall source; pass
        True (or memory_type="code") to search the indexed TypeScript too.

    Args:
        query: Natural-language question, e.g. "como funciona a auditoria de super_admin?".
        k: Number of results to return (default 5).
        memory_type: Restrict to one memory type (see above).
        document: Restrict to one document id.
        section: Restrict to one section title.
        app: Restrict code results to one app ("backend", "frontend", "@repo/utils").
        module: Restrict code results to one module/feature.
        layer: Restrict code results to one layer ("domain", "application", ...).
        include_code: Include memory_type="code" results (default False).
    """
    wants_code = include_code or memory_type == "code" or any((app, module, layer))
    flt = build_filter(
        exclude_code=not wants_code and not memory_type,
        memory_type=memory_type,
        document=document,
        section=section,
        app=app,
        module=module,
        layer=layer,
    )

    try:
        points = hybrid_search(query, k, flt)
    except Exception as exc:
        return (
            f"Search failed (Ollama up at {config.OLLAMA_URL}? "
            f"Qdrant up at {config.QDRANT_URL}?): {exc}"
        )

    if not points:
        if flt is not None:
            return "No results for that filter. Try a broader query or drop the filter."
        return "No results. The index may be empty — run bin/scripts/rag/index.py to build it."

    blocks = []
    for r in expand_parents(points, k):
        header = f"[{r['score']:.3f}] ({r['memory_type']}) {r['breadcrumb']}"
        if r["origin"] == "parent" and r["parent_section"]:
            header += f"  → seção: {r['parent_section']}"
        blocks.append(f"{header}\n{r['source']}\n{r['text']}")
    return "\n\n".join(blocks)


@mcp.tool()
def memory_status() -> str:
    """Report the memory index health: collection name and indexed chunk count.

    Use this to check whether the index exists and is populated before relying on
    memory_search results.
    """
    try:
        client = get_client()
        if not client.collection_exists(config.COLLECTION):
            return (
                f"Collection '{config.COLLECTION}' does not exist — "
                "run bin/scripts/rag/index.py first."
            )
        count = client.count(collection_name=config.COLLECTION, exact=True).count
        by_type: dict[str, int] = {}
        offset = None
        while True:
            res, offset = client.scroll(
                collection_name=config.COLLECTION,
                with_payload=["memory_type"],
                with_vectors=False,
                limit=256,
                offset=offset,
            )
            for p in res:
                mt = (p.payload or {}).get("memory_type", "?")
                by_type[mt] = by_type.get(mt, 0) + 1
            if offset is None:
                break
        breakdown = ", ".join(
            f"{mt}={n}" for mt, n in sorted(by_type.items(), key=lambda kv: -kv[1])
        )
        return (
            f"Collection '{config.COLLECTION}': {count} chunks indexed at "
            f"{config.QDRANT_URL}.\nBy type: {breakdown}"
        )
    except Exception as exc:
        return f"Status check failed (is Qdrant up at {config.QDRANT_URL}?): {exc}"


if __name__ == "__main__":
    mcp.run()
