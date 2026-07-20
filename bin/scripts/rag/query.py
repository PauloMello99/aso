#!/usr/bin/env python3
"""Semantic search over the memory index (hybrid dense+sparse + parent expansion).

Usage:
    python query.py "como funciona a arquitetura clean"
    python query.py -k 8 "package aliasing"
    python query.py --type adr "consequências"
    python query.py --document ADR-0015 "hybrid search"
    python query.py --code --app backend --module audit "guard de super_admin"
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from mcp_server import expand_parents, hybrid_search
from qdrant_store import build_filter


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("question", nargs="+")
    parser.add_argument("-k", type=int, default=5, help="top-k results")
    parser.add_argument("--type", dest="memory_type", help="filter by memory_type (e.g. adr, doc, code)")
    parser.add_argument("--document", help="filter by document (e.g. ADR-0015)")
    parser.add_argument("--section", help="filter by section title")
    parser.add_argument("--app", help="code filter: app (backend, frontend, @repo/utils)")
    parser.add_argument("--module", help="code filter: module/feature")
    parser.add_argument("--layer", help="code filter: layer (domain, application, ...)")
    parser.add_argument("--code", action="store_true", help="include code results")
    args = parser.parse_args()

    question = " ".join(args.question)
    wants_code = args.code or args.memory_type == "code" or any(
        (args.app, args.module, args.layer)
    )
    flt = build_filter(
        exclude_code=not wants_code and not args.memory_type,
        memory_type=args.memory_type,
        document=args.document,
        section=args.section,
        app=args.app,
        module=args.module,
        layer=args.layer,
    )

    points = hybrid_search(question, args.k, flt)
    if not points:
        print("No results found.")
        return

    for i, hit in enumerate(expand_parents(points, args.k), 1):
        print(f"\n{'='*60}")
        origin = "" if hit["origin"] == "parent" else "  (fallback: chunk)"
        print(f"[{i}] score={hit['score']:.4f}  ({hit['memory_type']})  {hit['breadcrumb']}{origin}")
        print(f"{'='*60}")
        text = hit["text"]
        print(text[:900] + ("..." if len(text) > 900 else ""))


if __name__ == "__main__":
    main()
