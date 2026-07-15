#!/usr/bin/env python3
"""One-time artifact warm-up (run by /rag-setup, never by hooks).

Downloads/caches: the XLM-RoBERTa tokenizer (token-aware chunking) and the
fastembed Qdrant/bm25 model (sparse vectors), then prints a smoke report.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import tokenizer
import sparse


def main() -> None:
    n = tokenizer.count_tokens("olá mundo, controle financeiro doméstico")
    print(f"tokenizer: {'FALLBACK (chars/3.3)' if tokenizer.using_fallback() else 'ok'} — sample={n} tokens")
    sv = sparse.embed_sparse_query("lembrete de contas a pagar")
    print(f"sparse BM25: ok — {len(sv.indices)} termos na query de teste")


if __name__ == "__main__":
    main()
