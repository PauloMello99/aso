#!/usr/bin/env python3
"""Build or refresh the Qdrant memory index.

Usage:
    python index.py                # full rebuild (recreates collection)
    python index.py --no-recreate  # true incremental: re-embed only changed chunks

Each chunk is embedded from an *enriched* context (type + document + section +
breadcrumb + body, see embedding_context.build_embedding_text) rather than the
bare body, and carries structured metadata + a content hash in its payload.

Incremental mode (`--no-recreate`):
  - skips chunks whose stored `chunk_hash` matches the freshly computed one
    (no embedding cost for unchanged content), and
  - deletes orphaned points — stale chunks left behind when a file shrinks,
    is re-sectioned, or renamed.
"""
import argparse
import hashlib
import sys
import uuid
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from chunker import chunk_markdown
from config import COLLECTION, EMBED_DIM, EXTRA_FILES, INDEX_GLOBS
from embedding_context import build_embedding_text
from metadata import extract_doc_metadata
from ollama_client import embed
from qdrant_client.models import PointIdsList, PointStruct
from qdrant_store import ensure_collection, get_client, recreate_collection

BATCH_SIZE = 64
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


def collect_files() -> list[Path]:
    root = _repo_root()
    files: list[Path] = []
    seen: set[str] = set()
    for pattern in INDEX_GLOBS:
        for p in root.glob(pattern):
            if p.is_file() and str(p) not in seen:
                files.append(p)
                seen.add(str(p))
    for extra in EXTRA_FILES:
        p = Path(extra)
        if p.is_file() and str(p) not in seen:
            files.append(p)
            seen.add(str(p))
    return files


def build_points(files: list[Path], root: Path) -> tuple[list[dict], dict[str, set]]:
    """Build per-chunk records and the set of current point-ids per source.

    Each record is ``{id, payload, embedding_text}``; the vector is filled later
    only for chunks that actually need (re-)embedding.
    """
    records: list[dict] = []
    source_ids: dict[str, set] = defaultdict(set)

    for fpath in files:
        rel = fpath.relative_to(root).as_posix()
        raw = fpath.read_text(encoding="utf-8", errors="ignore")
        doc_meta = extract_doc_metadata(rel, raw)
        chunks = chunk_markdown(raw, rel)

        for i, chunk in enumerate(chunks):
            payload = {
                "memory_type": doc_meta["memory_type"],
                "document": doc_meta["document"],
                "title": doc_meta["title"],
                "category": doc_meta["category"],
                "tags": doc_meta["tags"],
                "source": rel,
                "breadcrumb": chunk["breadcrumb"],
                "section": chunk["section"],
                "text": chunk["body"],
            }
            embedding_text = build_embedding_text(payload)
            payload["chunk_hash"] = chunk_hash(embedding_text)
            pid = point_id(rel, i)
            source_ids[rel].add(pid)
            records.append(
                {"id": pid, "payload": payload, "embedding_text": embedding_text}
            )

    return records, source_ids


def _existing_hashes(client, ids: list[str]) -> dict[str, str]:
    """Map point-id -> stored chunk_hash for ids already in the collection."""
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
    """Delete stale points — any point not in the current valid id-set.

    A single pass over the collection covers every staleness case: a shrunk file
    (fewer chunks), a re-sectioned file (different ids), a renamed file, and a
    file no longer matched by INDEX_GLOBS or deleted from disk entirely.
    """
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
    """Embed (enriched text) and upsert the given records in batches."""
    for start in range(0, len(records), BATCH_SIZE):
        batch = records[start : start + BATCH_SIZE]
        vectors = embed([r["embedding_text"] for r in batch])
        points = [
            PointStruct(id=r["id"], vector=vec, payload=r["payload"])
            for r, vec in zip(batch, vectors)
        ]
        client.upsert(collection_name=COLLECTION, points=points)
        print(f"  Upserted {start + len(batch)}/{len(records)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-recreate", action="store_true")
    args = parser.parse_args()

    incremental = args.no_recreate
    if incremental:
        ensure_collection()
    else:
        recreate_collection()
        print(f"Collection '{COLLECTION}' recreated (dim={EMBED_DIM}).")

    root = _repo_root()
    files = collect_files()
    print(f"Indexing {len(files)} file(s)...")

    records, source_ids = build_points(files, root)
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
