#!/usr/bin/env python3
"""Semantic search over the memory index.

Usage:
    python query.py "monorepo conventions"
    python query.py -k 8 "package aliasing"
    python query.py --type adr "consequências"
    python query.py --document ADR-0010 "saldo"
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import COLLECTION
from ollama_client import embed_query
from qdrant_store import build_filter, get_client


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("question", nargs="+")
    parser.add_argument("-k", type=int, default=5, help="top-k results")
    parser.add_argument("--type", dest="memory_type", help="filter by memory_type (e.g. adr, doc)")
    parser.add_argument("--document", help="filter by document (e.g. ADR-0010)")
    parser.add_argument("--section", help="filter by section title")
    args = parser.parse_args()

    question = " ".join(args.question)
    vector = embed_query(question)
    client = get_client()

    flt = build_filter(
        memory_type=args.memory_type, document=args.document, section=args.section
    )

    results = client.query_points(
        collection_name=COLLECTION,
        query=vector,
        query_filter=flt,
        limit=args.k,
        with_payload=True,
    ).points

    if not results:
        print("No results found.")
        return

    for i, hit in enumerate(results, 1):
        payload = hit.payload or {}
        tag = payload.get("memory_type", "")
        print(f"\n{'='*60}")
        print(f"[{i}] score={hit.score:.4f}  ({tag})  {payload.get('breadcrumb', '')}")
        print(f"{'='*60}")
        text = payload.get("text", "")
        snippet = text[:500]
        print(snippet + ("..." if len(text) > 500 else ""))


if __name__ == "__main__":
    main()
