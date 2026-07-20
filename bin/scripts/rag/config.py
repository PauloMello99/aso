import os

QDRANT_URL = os.getenv("RAG_QDRANT_URL", "http://localhost:6333")
OLLAMA_URL = os.getenv("RAG_OLLAMA_URL", "http://localhost:11434")

# bge-m3: multilingual (pt-BR!), 1024d, 8k context. See ADR-0015.
EMBED_MODEL = os.getenv("RAG_EMBED_MODEL", "bge-m3")
EMBED_DIM = int(os.getenv("RAG_EMBED_DIM", "1024"))
COLLECTION = os.getenv("RAG_COLLECTION", "ink_ops_memory")

# Markdown sources (memory bank + docs).
INDEX_GLOBS = [
    ".memory/**/*.md",
    "docs/**/*.md",
    "packages/*/README.md",
    ".claude/CLAUDE.md",
]

# TypeScript sources (opt-in at query time: memory_search excludes code by default).
# ink-ops layout: apps/backend (NestJS, .ts), apps/frontend (Next.js, .ts/.tsx),
# packages/{types,utils} (.ts). packages/{eslint,typescript}-config have no src/.
CODE_GLOBS = [
    "apps/backend/src/**/*.ts",
    "apps/frontend/src/**/*.ts",
    "apps/frontend/src/**/*.tsx",
    "packages/types/src/**/*.ts",
    "packages/utils/src/**/*.ts",
]
# Path substrings that disqualify a code file from indexing.
CODE_EXCLUDES = (
    ".spec.",
    ".test.",
    "/dist/",
    "/.next/",
    "database.types",
    "/drizzle/meta/",
    ".d.ts",
)

EXTRA_FILES: list[str] = []

# Token-aware chunking (tokenizer.py — XLM-RoBERTa, bge-m3's tokenizer).
CHUNK_TOKENS = int(os.getenv("RAG_CHUNK_TOKENS", "400"))
OVERLAP_TOKENS = int(os.getenv("RAG_OVERLAP_TOKENS", "60"))
MIN_CHUNK_TOKENS = int(os.getenv("RAG_MIN_CHUNK_TOKENS", "80"))
# Parent section (H1/H2) returned by parent-document retrieval, capped.
PARENT_MAX_TOKENS = int(os.getenv("RAG_PARENT_MAX_TOKENS", "1600"))
PARENT_MAX_CHARS = int(os.getenv("RAG_PARENT_MAX_CHARS", "2000"))

# Dense prefetch score floor for hybrid search (cosine; RRF scores are not cosine).
MIN_SCORE = float(os.getenv("RAG_MIN_SCORE", "0.35"))
