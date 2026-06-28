import re

from config import MAX_CHUNK_CHARS, MIN_CHUNK_CHARS
from metadata import _parse_frontmatter

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)


def chunk_markdown(text: str, source: str) -> list[dict]:
    """Split markdown into chunk dicts ``{breadcrumb, section, body}``.

    - YAML frontmatter is stripped first; its `name`/`description` (when present)
      are emitted as a leading synthetic chunk so that content is retrievable
      (previously it sat before the first heading and was silently dropped).
    - Bodies over MAX_CHUNK_CHARS are paragraph-split (``_split_large``).
    - Fragments under MIN_CHUNK_CHARS are merged into an adjacent sibling
      (``_merge_small``) to avoid low-context chunks.
    """
    fm, body = _parse_frontmatter(text)
    chunks: list[dict] = []

    intro = _frontmatter_chunk(fm, source)
    if intro:
        chunks.append(intro)

    chunks.extend(_chunk_body(body, source))
    return _merge_small(chunks)


def _frontmatter_chunk(fm: dict, source: str) -> dict | None:
    """Build a synthetic chunk from frontmatter name/description, if any."""
    name = str(fm.get("name") or "").strip()
    description = str(fm.get("description") or "").strip()
    if not description and not name:
        return None
    section = name or "Overview"
    body_parts = [p for p in (name, description) if p]
    return {
        "breadcrumb": f"{source} > {section}",
        "section": section,
        "body": "\n".join(body_parts),
    }


def _chunk_body(text: str, source: str) -> list[dict]:
    matches = list(HEADING_RE.finditer(text))
    if not matches:
        return [
            {"breadcrumb": bc, "section": source, "body": b}
            for bc, b in _split_large(source, text)
            if b
        ]

    chunks: list[dict] = []
    heading_stack: list[tuple[int, str]] = []

    for i, match in enumerate(matches):
        level = len(match.group(1))
        title = match.group(2).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()

        heading_stack = [(l, t) for l, t in heading_stack if l < level]
        heading_stack.append((level, title))
        breadcrumb = " > ".join(t for _, t in heading_stack)
        full_breadcrumb = f"{source} > {breadcrumb}"
        section = title

        for sub_breadcrumb, sub_body in _split_large(full_breadcrumb, body):
            if sub_body:
                chunks.append(
                    {"breadcrumb": sub_breadcrumb, "section": section, "body": sub_body}
                )

    return chunks


def _split_large(breadcrumb: str, text: str) -> list[tuple[str, str]]:
    if len(text) <= MAX_CHUNK_CHARS:
        return [(breadcrumb, text)]
    paragraphs = re.split(r"\n{2,}", text)
    chunks: list[tuple[str, str]] = []
    current = ""
    idx = 0
    for para in paragraphs:
        if len(current) + len(para) > MAX_CHUNK_CHARS and current:
            chunks.append((f"{breadcrumb} [{idx}]", current.strip()))
            current = para
            idx += 1
        else:
            current = current + "\n\n" + para if current else para
    if current.strip():
        chunks.append((f"{breadcrumb} [{idx}]", current.strip()))
    return chunks


def _merge_small(chunks: list[dict]) -> list[dict]:
    """Fold chunks shorter than MIN_CHUNK_CHARS into an adjacent chunk.

    A short chunk is prepended to the next chunk (keeping the next chunk's
    breadcrumb/section — the more substantive part wins); a trailing short chunk
    is appended to the previous one. Single-chunk lists are returned unchanged.
    """
    if len(chunks) <= 1:
        return chunks

    merged: list[dict] = []
    carry: dict | None = None

    for chunk in chunks:
        if carry is not None:
            chunk = {**chunk, "body": f"{carry['body']}\n\n{chunk['body']}"}
            carry = None
        if len(chunk["body"]) < MIN_CHUNK_CHARS:
            carry = chunk
            continue
        merged.append(chunk)

    if carry is not None:
        if merged:
            merged[-1] = {
                **merged[-1],
                "body": f"{merged[-1]['body']}\n\n{carry['body']}",
            }
        else:
            merged.append(carry)

    return merged
