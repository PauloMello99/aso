"""Sparse (BM25) embeddings via fastembed, for Qdrant hybrid search.

The collection's sparse vector is configured with Modifier.IDF, so Qdrant
applies IDF server-side; fastembed's Qdrant/bm25 model provides the term
frequencies. Model artifacts are downloaded on first use — run during
/rag-setup, never inside hooks.
"""
from qdrant_client.models import SparseVector

_model = None


def _get():
    global _model
    if _model is None:
        from fastembed import SparseTextEmbedding

        _model = SparseTextEmbedding(model_name="Qdrant/bm25")
    return _model


def embed_sparse(texts: list[str]) -> list[SparseVector]:
    return [
        SparseVector(indices=e.indices.tolist(), values=e.values.tolist())
        for e in _get().embed(texts)
    ]


def embed_sparse_query(text: str) -> SparseVector:
    e = next(_get().query_embed(text))
    return SparseVector(indices=e.indices.tolist(), values=e.values.tolist())
