import requests
from config import OLLAMA_URL, EMBED_MODEL

_session = requests.Session()


def embed(texts: list[str], task: str = "search_document") -> list[list[float]]:
    prefixed = [f"{task}: {t}" for t in texts]
    resp = _session.post(
        f"{OLLAMA_URL}/api/embed",
        json={"model": EMBED_MODEL, "input": prefixed},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["embeddings"]


def embed_query(text: str) -> list[float]:
    return embed([text], task="search_query")[0]
