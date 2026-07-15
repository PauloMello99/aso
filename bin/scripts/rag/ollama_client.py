import requests
from config import OLLAMA_URL, EMBED_MODEL

_session = requests.Session()

# bge-m3 takes no instruction prefixes (the search_document:/search_query:
# prefixes were nomic-embed-text specific — do not reintroduce them).


def embed(texts: list[str]) -> list[list[float]]:
    resp = _session.post(
        f"{OLLAMA_URL}/api/embed",
        json={"model": EMBED_MODEL, "input": texts},
        timeout=300,
    )
    resp.raise_for_status()
    return resp.json()["embeddings"]


def embed_query(text: str) -> list[float]:
    return embed([text])[0]
