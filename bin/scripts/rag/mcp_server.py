"""Stdio MCP server exposing the ink-ops memory bank as agent-callable tools.

Wraps the same retrieval path as query.py so a live Claude session can recall project
knowledge mid-chat instead of re-reading whole memory files or scanning source.

    memory_search(query, k=5)  -> top-k chunks (section breadcrumb + cosine score + text)
    memory_status()            -> collection point count, so the agent can tell whether the
                                  index is empty/stale before trusting a search

Launched via .claude/settings.json (server name "ink-memory"). Local context-retrieval
tooling for ink-ops only. Run standalone for a smoke test:

    ~/ink-ops-rag-venv/bin/python bin/scripts/rag/mcp_server.py
"""
import sys
from pathlib import Path

# Allow `import config` / `from ollama_client import ...` regardless of launch cwd.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from mcp.server.fastmcp import FastMCP

import config
from ollama_client import embed_query
from qdrant_store import build_filter, get_client

_SNIPPET_CHARS = 600

mcp = FastMCP("ink-memory")


@mcp.tool()
def memory_search(
    query: str,
    k: int = 5,
    memory_type: str | None = None,
    document: str | None = None,
    section: str | None = None,
) -> str:
    """Semantic search over the ink-ops memory bank (.memory/, docs/, package READMEs, CLAUDE.md).

    Call this BEFORE reading source code to answer "where/how does X work" questions.
    Returns the top-k most relevant chunks with their type, section breadcrumb and cosine score.

    Optional metadata filters scope the search (use them to cut noise):
      - memory_type: "adr" (architecture decisions), "doc", "architecture",
        "domain-rules", "project-overview", "recent-decisions", "package-readme",
        "claude". E.g. memory_type="adr" to search only ADRs / decisions.
      - document: a specific doc id, e.g. "ADR-0010".
      - section: a specific section title, e.g. "Consequências".

    Args:
        query: Natural-language question, e.g. "where do materials use-cases live?".
        k: Number of chunks to return (default 5).
        memory_type: Restrict to one memory type (see above).
        document: Restrict to one document id.
        section: Restrict to one section title.
    """
    try:
        vector = embed_query(query)
    except Exception as exc:
        return f"Embedding failed (is Ollama up at {config.OLLAMA_URL}?): {exc}"

    flt = build_filter(memory_type=memory_type, document=document, section=section)

    try:
        results = get_client().query_points(
            collection_name=config.COLLECTION,
            query=vector,
            query_filter=flt,
            limit=k,
            with_payload=True,
        ).points
    except Exception as exc:
        return f"Qdrant query failed (is Qdrant up at {config.QDRANT_URL}?): {exc}"

    if not results:
        if flt is not None:
            return "No results for that filter. Try a broader query or drop the filter."
        return "No results. The index may be empty — run bin/scripts/rag/index.py to build it."

    blocks = []
    for r in results:
        payload = r.payload or {}
        snippet = payload.get("text", "")
        if len(snippet) > _SNIPPET_CHARS:
            snippet = snippet[:_SNIPPET_CHARS] + " …"
        breadcrumb = payload.get("breadcrumb", "")
        source = payload.get("source", "")
        mtype = payload.get("memory_type", "")
        blocks.append(f"[{r.score:.3f}] ({mtype}) {breadcrumb}\n{source}\n{snippet}")
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
