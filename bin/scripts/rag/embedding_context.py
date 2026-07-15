"""Build the enriched text that actually gets embedded for a chunk.

Folds structural context (type, document, section, breadcrumb — and for code:
language, app, module, layer) into a deterministic, human-readable block so the
vector captures *what* the text is and *where* it lives, not just the words.
The format is stable across re-indexes (lines with empty values are omitted),
which also makes it a sound basis for chunk hashing.
"""


def build_embedding_text(payload: dict) -> str:
    """Render the embedding input for a chunk payload.

    Markdown chunks use memory_type/document/section; code chunks additionally
    carry language/app/module/layer. Missing/empty fields are skipped.
    """
    lines: list[str] = []

    header = [
        ("Memory Type", payload.get("memory_type")),
        ("Document", payload.get("document")),
        ("Section", payload.get("section")),
        ("Language", payload.get("language")),
        ("App", payload.get("app")),
        ("Module", payload.get("module")),
        ("Layer", payload.get("layer")),
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
