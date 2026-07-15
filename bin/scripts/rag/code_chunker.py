"""Chunking of TypeScript sources by top-level symbols (ADR-0015).

No tree-sitter: well-formatted TS (this repo is Prettier-enforced) splits
reliably on top-level declaration starts. Each chunk is one or more whole
top-level symbols, token-bounded like markdown chunks. Small files (under
CHUNK_TOKENS) become a single chunk.

Path-derived metadata: app (backend/frontend/<package>), module (NestJS module
or frontend feature), layer (domain/application/infrastructure/interface/...).
"""
import re
from pathlib import PurePosixPath

from config import CHUNK_TOKENS, MIN_CHUNK_TOKENS
from tokenizer import count_tokens

# Top-level declaration starts (column 0), incl. decorated classes.
DECL_RE = re.compile(
    r"^(?:@\w+\(|export\s+(?:default\s+)?(?:abstract\s+)?"
    r"(?:class|function|const|interface|type|enum|async function)\b"
    r"|(?:abstract\s+)?class\b|function\b|const\b|interface\b|type\b|enum\b)",
    re.MULTILINE,
)


def code_path_metadata(source: str) -> dict:
    """Derive {app, module, layer, symbol_hint} from a repo-relative path."""
    p = PurePosixPath(source.replace("\\", "/"))
    parts = p.parts

    app = ""
    module = ""
    layer = ""

    if parts[0] == "apps" and len(parts) > 1:
        app = parts[1]
        if "modules" in parts:
            i = parts.index("modules")
            if len(parts) > i + 1:
                module = parts[i + 1]
        elif "features" in parts:
            i = parts.index("features")
            if len(parts) > i + 1:
                module = parts[i + 1]
        for candidate in ("domain", "application", "infrastructure", "interface",
                          "components", "hooks", "pages", "common", "database",
                          "shared", "lib", "schemas"):
            if candidate in parts:
                layer = candidate
                break
    elif parts[0] == "packages" and len(parts) > 1:
        app = f"@repo/{parts[1]}"

    return {"app": app, "module": module, "layer": layer}


def chunk_code(text: str, source: str) -> list[dict]:
    """Split a TS file into symbol-aligned, token-bounded chunks.

    Returns the same chunk shape as chunk_markdown; the whole file acts as the
    parent (capped at read time by PARENT_MAX_CHARS in the MCP server).
    """
    body = text.strip("\n")
    if not body.strip():
        return []

    name = PurePosixPath(source).name

    if count_tokens(body) <= CHUNK_TOKENS:
        return [_chunk(source, name, body, 0, len(text))]

    starts = [m.start() for m in DECL_RE.finditer(text)]
    if not starts or starts[0] > 0:
        starts.insert(0, 0)

    segments: list[tuple[int, int]] = [
        (s, starts[i + 1] if i + 1 < len(starts) else len(text))
        for i, s in enumerate(starts)
    ]

    chunks: list[dict] = []
    cur_start: int | None = None
    cur_end = 0
    cur_tokens = 0
    idx = 0

    def emit():
        nonlocal cur_start, cur_tokens, idx
        if cur_start is None:
            return
        seg_text = text[cur_start:cur_end].strip("\n")
        if seg_text.strip():
            chunks.append(_chunk(source, f"{name} [{idx}]", seg_text, cur_start, cur_end))
            idx += 1
        cur_start = None
        cur_tokens = 0

    for seg_s, seg_e in segments:
        seg_tokens = count_tokens(text[seg_s:seg_e])
        if cur_start is not None and cur_tokens + seg_tokens > CHUNK_TOKENS:
            emit()
        if cur_start is None:
            cur_start = seg_s
        cur_end = seg_e
        cur_tokens += seg_tokens
        if seg_tokens >= CHUNK_TOKENS:
            emit()
    emit()

    # Merge a tiny trailing chunk into the previous one.
    if len(chunks) > 1 and count_tokens(chunks[-1]["body"]) < MIN_CHUNK_TOKENS:
        last = chunks.pop()
        chunks[-1] = {
            **chunks[-1],
            "body": chunks[-1]["body"] + "\n\n" + last["body"],
            "char_end": last["char_end"],
        }

    if len(chunks) == 1:
        chunks[0]["section"] = name
        chunks[0]["breadcrumb"] = f"{source} > {name}"
    return chunks


def _chunk(source: str, section: str, body: str, start: int, end: int) -> dict:
    return {
        "breadcrumb": f"{source} > {section}",
        "section": section,
        "body": body,
        "char_start": start,
        "char_end": end,
        # Whole file is the parent for code; hash left empty → MCP server
        # falls back to the chunk snippet if it can't read the file.
        "parent_section": PurePosixPath(source).name,
        "parent_start": 0,
        "parent_end": end,
        "parent_hash": "",
    }
