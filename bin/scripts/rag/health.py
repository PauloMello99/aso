#!/usr/bin/env python3
"""Diagnostics for the Qdrant memory index.

Two modes:

    python health.py                      # stats report (default)
    python health.py --validate           # similarity validation (random sample)
    python health.py --validate --samples 8

Stats report covers: total documents/chunks, chunk-size distribution,
memory_type distribution, largest/smallest documents, duplicate chunk
candidates (same chunk_hash), orphan points (source no longer on disk), and
collection stats.

Validation samples random chunks, retrieves their nearest neighbours, and prints
source/section/score so you can eyeball whether embeddings cluster sensibly.
"""
import argparse
import random
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import COLLECTION, QDRANT_URL
from qdrant_store import get_client

SCROLL_PAGE = 256


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "turbo.json").exists():
            return parent
    return current.parents[3]


def _scroll_all(client, with_vectors: bool = False) -> list:
    points: list = []
    offset = None
    while True:
        res, offset = client.scroll(
            collection_name=COLLECTION,
            with_payload=True,
            with_vectors=with_vectors,
            limit=SCROLL_PAGE,
            offset=offset,
        )
        points.extend(res)
        if offset is None:
            break
    return points


def _histogram(sizes: list[int]) -> list[tuple[str, int]]:
    buckets = [(0, 250), (250, 500), (500, 1000), (1000, 1500), (1500, 10**9)]
    labels = ["<250", "250-500", "500-1000", "1000-1500", ">1500"]
    counts = [0] * len(buckets)
    for s in sizes:
        for i, (lo, hi) in enumerate(buckets):
            if lo <= s < hi:
                counts[i] += 1
                break
    return list(zip(labels, counts))


def report() -> None:
    client = get_client()
    if not client.collection_exists(COLLECTION):
        print(f"Collection '{COLLECTION}' does not exist — run index.py first.")
        return

    points = _scroll_all(client)
    if not points:
        print(f"Collection '{COLLECTION}' is empty.")
        return

    sizes = [len((p.payload or {}).get("text", "")) for p in points]
    by_source: dict[str, int] = defaultdict(int)
    by_type: Counter = Counter()
    hash_groups: dict[str, list[str]] = defaultdict(list)

    for p in points:
        payload = p.payload or {}
        by_source[payload.get("source", "?")] += 1
        by_type[payload.get("memory_type", "?")] += 1
        h = payload.get("chunk_hash")
        if h:
            hash_groups[h].append(payload.get("breadcrumb", str(p.id)))

    root = _repo_root()
    orphan_sources = [s for s in by_source if s != "?" and not (root / s).is_file()]
    duplicates = {h: bc for h, bc in hash_groups.items() if len(bc) > 1}

    print(f"== Memory index health: '{COLLECTION}' @ {QDRANT_URL} ==\n")
    print(f"Documents (distinct source): {len(by_source)}")
    print(f"Chunks (points):             {len(points)}\n")

    print("Chunk size (chars):")
    print(f"  min={min(sizes)}  avg={statistics.mean(sizes):.0f}  "
          f"median={statistics.median(sizes):.0f}  max={max(sizes)}")
    for label, count in _histogram(sizes):
        bar = "#" * count
        print(f"  {label:>9} | {count:4d} {bar}")
    print()

    print("By memory_type:")
    for mt, n in by_type.most_common():
        print(f"  {mt:<20} {n}")
    print()

    top = sorted(by_source.items(), key=lambda kv: -kv[1])
    print("Largest documents (by chunks):")
    for src, n in top[:5]:
        print(f"  {n:4d}  {src}")
    print("Smallest documents (by chunks):")
    for src, n in top[-5:][::-1]:
        print(f"  {n:4d}  {src}")
    print()

    print(f"Duplicate chunk candidates (same content hash): {len(duplicates)}")
    for h, bcs in list(duplicates.items())[:5]:
        print(f"  {h[:12]}… x{len(bcs)}")
        for bc in bcs[:3]:
            print(f"      {bc}")
    print()

    print(f"Orphan sources (indexed but missing on disk): {len(orphan_sources)}")
    for s in orphan_sources[:10]:
        print(f"  {s}")
    print()

    info = client.get_collection(COLLECTION)
    print("Collection stats:")
    print(f"  points_count={info.points_count}  status={info.status}")


def validate(samples: int) -> None:
    client = get_client()
    if not client.collection_exists(COLLECTION):
        print(f"Collection '{COLLECTION}' does not exist — run index.py first.")
        return

    points = _scroll_all(client, with_vectors=True)
    if not points:
        print(f"Collection '{COLLECTION}' is empty.")
        return

    rng = random.Random(42)  # deterministic sample
    chosen = rng.sample(points, min(samples, len(points)))

    for seed in chosen:
        payload = seed.payload or {}
        print(f"\n{'='*70}")
        print(f"SEED ({payload.get('memory_type','?')}) {payload.get('breadcrumb','')}")
        print(f"  {payload.get('source','')}  §{payload.get('section','')}")
        print(f"{'-'*70}")

        neighbours = client.query_points(
            collection_name=COLLECTION,
            query=seed.vector,
            limit=4,
            with_payload=True,
        ).points

        for n in neighbours:
            if str(n.id) == str(seed.id):
                continue
            np = n.payload or {}
            same = "≈" if np.get("memory_type") == payload.get("memory_type") else "≠"
            print(f"  {n.score:.3f} {same} ({np.get('memory_type','?')}) "
                  f"{np.get('source','')} §{np.get('section','')}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate", action="store_true", help="similarity validation mode")
    parser.add_argument("--samples", type=int, default=5, help="random chunks to sample")
    args = parser.parse_args()

    if args.validate:
        validate(args.samples)
    else:
        report()


if __name__ == "__main__":
    main()
