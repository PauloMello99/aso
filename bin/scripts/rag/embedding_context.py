"""Build the enriched text that actually gets embedded for a chunk.

Previously only `payload["text"]` (the bare body) was embedded, discarding the
document type, identifier, section, and breadcrumb the indexer already computes.
That made same-named sections across documents (e.g. every ADR's "Consequências")
embed near-identically.

`build_embedding_text` folds that structural context into a deterministic,
human-readable block so the vector captures *what* the text is and *where* it
lives, not just the words. The format is stable across re-indexes (lines with
empty values are omitted), which also makes it a sound basis for chunk hashing.
"""


def build_embedding_text(payload: dict) -> str:
    """Render the embedding input for a chunk payload.

    Expects payload keys: memory_type, document, section, breadcrumb, text.
    Missing/empty fields are skipped so the output stays deterministic.
    """
    lines: list[str] = []

    header = [
        ("Memory Type", payload.get("memory_type")),
        ("Document", payload.get("document")),
        ("Section", payload.get("section")),
    ]
    for label, value in header:
        if value:
            lines.append(f"{label}: {value}")

    breadcrumb = payload.get("breadcrumb")
    if breadcrumb:
        if lines:
            lines.append("")
        lines.append("Breadcrumb:")
        lines.append(str(breadcrumb))

    text = payload.get("text") or ""
    if lines:
        lines.append("")
    lines.append("Content:")
    lines.append(text)

    return "\n".join(lines)
