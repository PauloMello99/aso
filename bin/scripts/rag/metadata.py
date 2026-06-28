"""Structured metadata extraction for the memory index.

Derives queryable, filterable fields from a file's path and content so that
retrieval can be scoped ("ADRs only", "architecture docs", a specific document).

Inferred fields (per document):

| field         | source                                                          |
|---------------|-----------------------------------------------------------------|
| memory_type   | path: `.memory/adr/*` -> "adr"; `.memory/<stem>.md` -> stem;     |
|               | `docs/*` -> "doc"; `packages/*/README.md` -> "package-readme";   |
|               | `.claude/CLAUDE.md` -> "claude"; else "other"                    |
| document      | ADRs -> "ADR-NNNN" (filename digits, fallback H1);               |
|               | package READMEs -> package dir name; else file stem              |
| title         | frontmatter `name` -> first H1 -> file stem                      |
| category      | frontmatter `metadata.type` (user|feedback|project|reference)   |
| tags          | reserved; [] unless frontmatter carries a `tags:` list           |

Per-chunk, `section` is added by the indexer as the last breadcrumb segment.

Frontmatter is parsed without PyYAML: the `.memory/` frontmatter is flat
key/value pairs plus a single nested `metadata:` block, which a small regex
parser handles deterministically. Files without frontmatter are fully supported.
"""
import re
from pathlib import PurePosixPath

_FRONTMATTER_RE = re.compile(r"\A﻿?---[ \t]*\r?\n(.*?)\r?\n---[ \t]*\r?\n", re.DOTALL)
_H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
_ADR_NUM_RE = re.compile(r"(\d{3,4})")


def _norm(source: str) -> str:
    """Normalise a repo-relative path to forward slashes."""
    return source.replace("\\", "/")


def _parse_frontmatter(raw: str) -> tuple[dict, str]:
    """Return (frontmatter_dict, body_without_frontmatter).

    Supports flat `key: value` lines and a one-level nested block (e.g.
    `metadata:` followed by indented `type: project`). Nested blocks are stored
    as a dict under their key. Inline `[a, b]` lists are parsed into lists.
    """
    m = _FRONTMATTER_RE.match(raw)
    if not m:
        return {}, raw

    fm: dict = {}
    current_block: dict | None = None
    for line in m.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indented = line[0] in (" ", "\t")
        key, sep, value = line.strip().partition(":")
        if not sep:
            continue
        key = key.strip()
        value = value.strip()
        if indented and current_block is not None:
            current_block[key] = _coerce(value)
        elif value == "":
            current_block = {}
            fm[key] = current_block
        else:
            current_block = None
            fm[key] = _coerce(value)

    body = raw[m.end():]
    return fm, body


def _coerce(value: str):
    """Coerce a scalar frontmatter value, parsing inline lists."""
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [v.strip().strip("'\"") for v in inner.split(",")]
    return value.strip("'\"")


def _first_h1(text: str) -> str | None:
    m = _H1_RE.search(text)
    return m.group(1).strip() if m else None


def extract_doc_metadata(source: str, raw_text: str) -> dict:
    """Extract document-level metadata from a repo-relative path and its content.

    Returns a dict with keys: memory_type, document, title, category, tags.
    Always returns strings (or [] for tags); never None, so payloads stay stable.
    """
    norm = _norm(source)
    p = PurePosixPath(norm)
    stem = p.stem
    fm, body = _parse_frontmatter(raw_text)
    h1 = _first_h1(body)

    # memory_type
    if norm.startswith(".memory/adr/"):
        memory_type = "adr"
    elif norm.startswith(".memory/"):
        memory_type = stem  # project-overview, architecture, domain-rules, ...
    elif norm.startswith("docs/"):
        memory_type = "doc"
    elif norm.startswith("packages/") and p.name == "README.md":
        memory_type = "package-readme"
    elif p.name == "CLAUDE.md":
        memory_type = "claude"
    else:
        memory_type = "other"

    # document
    if memory_type == "adr":
        num = _ADR_NUM_RE.match(stem)
        if num:
            document = f"ADR-{int(num.group(1)):04d}"
        else:
            document = h1 or stem
    elif memory_type == "package-readme":
        document = p.parent.name
    else:
        document = stem

    # title / category / tags
    title = str(fm.get("name") or h1 or stem)
    category = ""
    meta_block = fm.get("metadata")
    if isinstance(meta_block, dict):
        category = str(meta_block.get("type", "") or "")
    tags = fm.get("tags") if isinstance(fm.get("tags"), list) else []

    return {
        "memory_type": memory_type,
        "document": document,
        "title": title,
        "category": category,
        "tags": tags,
    }
