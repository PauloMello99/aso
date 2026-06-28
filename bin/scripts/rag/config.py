import os

QDRANT_URL = os.getenv("RAG_QDRANT_URL", "http://localhost:6333")
OLLAMA_URL = os.getenv("RAG_OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("RAG_EMBED_MODEL", "nomic-embed-text")
EMBED_DIM = int(os.getenv("RAG_EMBED_DIM", "768"))
COLLECTION = os.getenv("RAG_COLLECTION", "ink_ops_memory")

INDEX_GLOBS = [
    ".memory/**/*.md",
    "docs/**/*.md",
    "packages/*/README.md",
    ".claude/CLAUDE.md",
]

EXTRA_FILES: list[str] = []

MAX_CHUNK_CHARS = 1500
# Chunks shorter than this (after heading splitting) are merged into an adjacent
# sibling chunk to avoid low-context fragments. See chunker._merge_small.
MIN_CHUNK_CHARS = int(os.getenv("RAG_MIN_CHUNK_CHARS", "250"))
