from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PayloadSchemaType,
    VectorParams,
)

from config import COLLECTION, EMBED_DIM, QDRANT_URL

_client: QdrantClient | None = None

# Keyword payload fields we filter on (metadata-aware retrieval). Indexed so
# server-side filtering stays efficient as the collection grows.
FILTERABLE_FIELDS = ("memory_type", "document", "section", "category")


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=QDRANT_URL)
    return _client


def ensure_payload_indexes() -> None:
    """Create keyword payload indexes for filtering. Idempotent."""
    client = get_client()
    for field in FILTERABLE_FIELDS:
        try:
            client.create_payload_index(
                collection_name=COLLECTION,
                field_name=field,
                field_schema=PayloadSchemaType.KEYWORD,
            )
        except Exception:
            # Index already exists (or collection mid-creation) — safe to ignore.
            pass


def build_filter(**conditions) -> Filter | None:
    """Build a Qdrant must-match keyword Filter from given fields.

    Pass any of the FILTERABLE_FIELDS as keyword args (e.g.
    ``build_filter(memory_type="adr")``). None/empty values are ignored; returns
    None when no conditions are given (callers then query unfiltered).
    """
    must = [
        FieldCondition(key=key, match=MatchValue(value=value))
        for key, value in conditions.items()
        if value
    ]
    return Filter(must=must) if must else None


def ensure_collection() -> None:
    client = get_client()
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION not in existing:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
        )
    ensure_payload_indexes()


def recreate_collection() -> None:
    client = get_client()
    client.recreate_collection(
        collection_name=COLLECTION,
        vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
    )
    ensure_payload_indexes()
