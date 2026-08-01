#!/usr/bin/env python3
"""Build or refresh the Qdrant memory index (hybrid dense+sparse, ADR-0015).

Usage:
    python index.py                # full rebuild (recreates collection)
    python index.py --no-recreate  # true incremental: re-embed only changed chunks

Markdown (memory bank, docs) is chunked structure/token-aware with parent-section
offsets (chunker.py); TypeScript sources are chunked by top-level symbols
(code_chunker.py) and tagged memory_type="code" + app/module/layer.

Each chunk is embedded twice: dense (bge-m3 via Ollama, enriched context) and
sparse (BM25 via fastembed) into named vectors {dense, sparse}.

Incremental mode (`--no-recreate`):
  - skips chunks whose stored `chunk_hash` matches the freshly computed one, and
  - deletes orphaned points (file shrank, re-sectioned, renamed, or removed).
"""
import argparse
import hashlib
import sys
import uuid
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from chunker import chunk_markdown
from code_chunker import chunk_code, code_path_metadata
from config import (
    CODE_EXCLUDES,
    CODE_GLOBS,
    COLLECTION,
    EMBED_DIM,
    EXTRA_FILES,
    INDEX_GLOBS,
)
from embedding_context import build_embedding_text
from metadata import extract_doc_metadata
from ollama_client import embed
from qdrant_client.models import PointIdsList, PointStruct
from qdrant_store import DENSE, SPARSE, ensure_collection, get_client, recreate_collection
from sparse import embed_sparse
from tokenizer import using_fallback

BATCH_SIZE = 32  # bge-m3 is heavier than nomic
SCROLL_PAGE = 256
NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # UUID5 namespace


def point_id(path: str, chunk_idx: int) -> str:
    return str(uuid.uuid5(NS, f"{path}:{chunk_idx}"))


def chunk_hash(embedding_text: str) -> str:
    return hashlib.sha256(embedding_text.encode("utf-8")).hexdigest()


def _repo_root() -> Path:
    """Walk up from this file until we find turbo.json (repo root marker)."""
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "turbo.json").exists():
            return parent
    return current.parents[3]  # fallback


def _collect(root: Path, patterns: list[str], excludes: tuple = ()) -> list[Path]:
    files: list[Path] = []
    seen: set[str] = set()
    for pattern in patterns:
        for p in root.glob(pattern):
            posix = p.as_posix()
            if not p.is_file() or posix in seen:
                continue
            if any(x in posix for x in excludes):
                continue
            files.append(p)
            seen.add(posix)
    return files


def collect_files(root: Path) -> tuple[list[Path], list[Path]]:
    md = _collect(root, INDEX_GLOBS)
    for extra in EXTRA_FILES:
        p = Path(extra)
        if p.is_file():
            md.append(p)
    code = _collect(root, CODE_GLOBS, CODE_EXCLUDES)
    return md, code


def _records_for_file(rel: str, raw: str, is_code: bool) -> list[dict]:
    if is_code:
        path_meta = code_path_metadata(rel)
        doc_meta = {
            "memory_type": "code",
            "document": rel,
            "title": Path(rel).name,
            "category": "",
            "tags": [],
        }
        chunks = chunk_code(raw, rel)
        extra = {"language": "TypeScript", **path_meta}
    else:
        doc_meta = extract_doc_metadata(rel, raw)
        chunks = chunk_markdown(raw, rel)
        extra = {}

    records = []
    for i, chunk in enumerate(chunks):
        payload = {
            **doc_meta,
            **extra,
            "source": rel,
            "breadcrumb": chunk["breadcrumb"],
            "section": chunk["section"],
            "text": chunk["body"],
            "char_start": chunk.get("char_start", 0),
            "char_end": chunk.get("char_end", 0),
            "parent_source": rel,
            "parent_section": chunk.get("parent_section", ""),
            "parent_start": chunk.get("parent_start", 0),
            "parent_end": chunk.get("parent_end", 0),
            "parent_hash": chunk.get("parent_hash", ""),
        }
        embedding_text = build_embedding_text(payload)
        payload["chunk_hash"] = chunk_hash(embedding_text)
        records.append(
            {
                "id": point_id(rel, i),
                "payload": payload,
                "embedding_text": embedding_text,
            }
        )
    return records


def build_points(root: Path) -> tuple[list[dict], dict[str, set]]:
    md_files, code_files = collect_files(root)
    print(f"Indexing {len(md_files)} markdown + {len(code_files)} code file(s)...")

    records: list[dict] = []
    source_ids: dict[str, set] = defaultdict(set)

    for group, is_code in ((md_files, False), (code_files, True)):
        for fpath in group:
            rel = fpath.relative_to(root).as_posix()
            raw = fpath.read_text(encoding="utf-8", errors="ignore")
            for rec in _records_for_file(rel, raw, is_code):
                source_ids[rel].add(rec["id"])
                records.append(rec)

    return records, source_ids


def _existing_hashes(client, ids: list[str]) -> dict[str, str]:
    hashes: dict[str, str] = {}
    for start in range(0, len(ids), SCROLL_PAGE):
        batch = ids[start : start + SCROLL_PAGE]
        found = client.retrieve(
            collection_name=COLLECTION,
            ids=batch,
            with_payload=["chunk_hash"],
            with_vectors=False,
        )
        for p in found:
            h = (p.payload or {}).get("chunk_hash")
            if h:
                hashes[str(p.id)] = h
    return hashes


def _delete_orphans(client, source_ids: dict[str, set]) -> int:
    valid: set[str] = set()
    for ids in source_ids.values():
        valid |= ids

    stale: list[str] = []
    offset = None
    while True:
        res, offset = client.scroll(
            collection_name=COLLECTION,
            with_payload=False,
            with_vectors=False,
            limit=SCROLL_PAGE,
            offset=offset,
        )
        stale.extend(str(p.id) for p in res if str(p.id) not in valid)
        if offset is None:
            break

    if stale:
        client.delete(
            collection_name=COLLECTION,
            points_selector=PointIdsList(points=stale),
        )
    return len(stale)


def _upsert_records(client, records: list[dict]) -> None:
    """Embed (dense + sparse) and upsert the given records in batches."""
    for start in range(0, len(records), BATCH_SIZE):
        batch = records[start : start + BATCH_SIZE]
        texts = [r["embedding_text"] for r in batch]
        dense_vecs = embed(texts)
        sparse_vecs = embed_sparse([r["payload"]["text"] for r in batch])
        points = [
            PointStruct(
                id=r["id"],
                vector={DENSE: dv, SPARSE: sv},
                payload=r["payload"],
            )
            for r, dv, sv in zip(batch, dense_vecs, sparse_vecs)
        ]
        client.upsert(collection_name=COLLECTION, points=points)
        print(f"  Upserted {start + len(batch)}/{len(records)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-recreate", action="store_true")
    args = parser.parse_args()

    if using_fallback():
        print("WARN: tokenizer fallback (chars/3.3) in use — run /rag-setup to fetch it.")

    incremental = args.no_recreate
    if incremental:
        ensure_collection()
    else:
        recreate_collection()
        print(f"Collection '{COLLECTION}' recreated (dense dim={EMBED_DIM} + sparse BM25).")

    root = _repo_root()
    records, source_ids = build_points(root)
    total = len(records)

    client = get_client()

    if incremental:
        stored = _existing_hashes(client, [r["id"] for r in records])
        changed = [r for r in records if stored.get(r["id"]) != r["payload"]["chunk_hash"]]
        skipped = total - len(changed)
        print(f"Incremental: {len(changed)} changed/new, {skipped} unchanged (skipped).")
        if changed:
            print(f"Embedding {len(changed)} chunk(s) in batches of {BATCH_SIZE}...")
            _upsert_records(client, changed)
        removed = _delete_orphans(client, source_ids)
        if removed:
            print(f"Removed {removed} orphan point(s).")
        print(
            f"Done. {len(changed)} embedded, {skipped} skipped, "
            f"{removed} orphans removed; {total} chunks current in '{COLLECTION}'."
        )
    else:
        print(f"Embedding {total} chunk(s) in batches of {BATCH_SIZE}...")
        _upsert_records(client, records)
        print(f"Done. {total} chunks indexed into '{COLLECTION}'.")


if __name__ == "__main__":
    main()
