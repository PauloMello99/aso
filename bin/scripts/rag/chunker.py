"""Structure-aware, token-aware markdown chunking (ADR-0015).

Pipeline per file:

1. Strip YAML frontmatter; `name`/`description` become a synthetic lead chunk.
2. Split by headings, keeping a heading stack for hierarchical breadcrumbs.
3. Within a section, split into **atomic blocks**: fenced code blocks and
   markdown tables are never cut mid-block; paragraphs are the base unit.
4. Accumulate blocks into chunks of up to CHUNK_TOKENS, with OVERLAP_TOKENS of
   trailing-block overlap between consecutive chunks of the same section.
5. Merge fragments under MIN_CHUNK_TOKENS into an adjacent sibling.

Every chunk carries char offsets into the ORIGINAL file text and its owning
**parent section** (nearest H1/H2 span, capped at PARENT_MAX_TOKENS) so the MCP
server can return whole-section context read fresh from disk
(parent-document retrieval):

    {breadcrumb, section, body, char_start, char_end,
     parent_section, parent_start, parent_end, parent_hash}
"""
import hashlib
import re

from config import CHUNK_TOKENS, MIN_CHUNK_TOKENS, OVERLAP_TOKENS, PARENT_MAX_TOKENS
from metadata import _parse_frontmatter
from tokenizer import count_tokens

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)
FENCE_RE = re.compile(r"^(```|~~~)", re.MULTILINE)


def parent_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def chunk_markdown(text: str, source: str) -> list[dict]:
    fm, body = _parse_frontmatter(text)
    fm_offset = len(text) - len(body)  # body offsets -> original-file offsets

    chunks: list[dict] = []
    intro = _frontmatter_chunk(fm, source)
    if intro:
        chunks.append(intro)

    chunks.extend(_chunk_body(text, body, fm_offset, source))
    return _merge_small(chunks)


def _frontmatter_chunk(fm: dict, source: str) -> dict | None:
    name = str(fm.get("name") or "").strip()
    description = str(fm.get("description") or "").strip()
    if not description and not name:
        return None
    section = name or "Overview"
    body = "\n".join(p for p in (name, description) if p)
    return {
        "breadcrumb": f"{source} > {section}",
        "section": section,
        "body": body,
        "char_start": 0,
        "char_end": 0,
        "parent_section": section,
        "parent_start": 0,
        "parent_end": 0,
        "parent_hash": "",
    }


def _chunk_body(original: str, body: str, offset: int, source: str) -> list[dict]:
    matches = list(HEADING_RE.finditer(body))

    if not matches:
        span = (offset, offset + len(body))
        parent = _cap_parent(original, span[0], span[1])
        return [
            {
                **c,
                "parent_section": source,
                "parent_start": parent[0],
                "parent_end": parent[1],
                "parent_hash": parent_hash(original[parent[0]:parent[1]]),
            }
            for c in _split_section(f"{source}", source, body, offset)
        ]

    # Section spans per heading (heading line included in the span start so the
    # parent slice carries its own title).
    headings = []  # (level, title, head_start, body_start, span_end)
    for i, m in enumerate(matches):
        level = len(m.group(1))
        span_end = len(body)
        for n in matches[i + 1:]:
            headings_level = len(n.group(1))
            if headings_level <= level:
                span_end = n.start()
                break
        headings.append((level, m.group(2).strip(), m.start(), m.end(), span_end))

    # Parent spans: nearest section of level <= 2 that contains a position.
    parents = [
        (h[2] + offset, h[4] + offset, h[1])
        for h in headings
        if h[0] <= 2
    ]

    def _parent_for(pos: int) -> tuple[int, int, str]:
        best = None
        for start, end, title in parents:
            if start <= pos < end:
                best = (start, end, title)  # later (deeper H2) wins over H1
        return best or (offset, offset + len(body), source)

    chunks: list[dict] = []
    heading_stack: list[tuple[int, str]] = []

    for i, m in enumerate(matches):
        level = len(m.group(1))
        title = m.group(2).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        section_body = body[start:end]
        if not section_body.strip():
            continue

        heading_stack = [(l, t) for l, t in heading_stack if l < level]
        heading_stack.append((level, title))
        breadcrumb = f"{source} > " + " > ".join(t for _, t in heading_stack)

        p_start, p_end, p_title = _parent_for(start + offset)
        p_start, p_end = _cap_parent(original, p_start, p_end)
        p_hash = parent_hash(original[p_start:p_end])

        for c in _split_section(breadcrumb, title, section_body, start + offset):
            chunks.append(
                {
                    **c,
                    "parent_section": p_title,
                    "parent_start": p_start,
                    "parent_end": p_end,
                    "parent_hash": p_hash,
                }
            )

    return chunks


def _cap_parent(original: str, start: int, end: int) -> tuple[int, int]:
    """Cap a parent span at PARENT_MAX_TOKENS (binary-search the char cut)."""
    if count_tokens(original[start:end]) <= PARENT_MAX_TOKENS:
        return start, end
    lo, hi = start, end
    while lo < hi - 64:
        mid = (lo + hi) // 2
        if count_tokens(original[start:mid]) <= PARENT_MAX_TOKENS:
            lo = mid
        else:
            hi = mid
    return start, lo


def _atomic_blocks(text: str, base: int) -> list[tuple[str, int, int]]:
    """Split section text into atomic blocks: (block_text, abs_start, abs_end).

    Fenced code blocks (``` / ~~~) and markdown table runs stay whole;
    everything else splits on blank lines.
    """
    blocks: list[tuple[str, int, int]] = []
    lines = text.splitlines(keepends=True)
    pos = 0
    cur: list[str] = []
    cur_start = 0
    in_fence = False
    fence_marker = ""
    in_table = False

    def flush(end_pos: int):
        nonlocal cur, cur_start
        joined = "".join(cur)
        if joined.strip():
            blocks.append((joined.strip("\n"), base + cur_start, base + end_pos))
        cur = []

    for line in lines:
        stripped = line.strip()
        starts_fence = stripped.startswith("```") or stripped.startswith("~~~")
        is_table_line = stripped.startswith("|")

        if in_fence:
            cur.append(line)
            if starts_fence and stripped.startswith(fence_marker):
                in_fence = False
                flush(pos + len(line))
                cur_start = pos + len(line)
        elif starts_fence:
            if cur and not in_table:
                flush(pos)
            elif in_table:
                flush(pos)
                in_table = False
            cur_start = pos
            cur = [line]
            in_fence = True
            fence_marker = stripped[:3]
        elif is_table_line:
            if not in_table and cur:
                flush(pos)
                cur_start = pos
            in_table = True
            if not cur:
                cur_start = pos
            cur.append(line)
        elif in_table:
            flush(pos)
            in_table = False
            cur_start = pos
            cur = [line] if stripped else []
        elif not stripped:
            if cur:
                flush(pos)
            cur_start = pos + len(line)
        else:
            if not cur:
                cur_start = pos
            cur.append(line)
        pos += len(line)

    if cur:
        flush(pos)
    return blocks


def _split_section(breadcrumb: str, section: str, text: str, abs_start: int) -> list[dict]:
    """Accumulate atomic blocks into token-bounded chunks with block overlap."""
    total_tokens = count_tokens(text)
    if total_tokens <= CHUNK_TOKENS:
        body = text.strip()
        if not body:
            return []
        return [
            {
                "breadcrumb": breadcrumb,
                "section": section,
                "body": body,
                "char_start": abs_start,
                "char_end": abs_start + len(text),
            }
        ]

    blocks = _atomic_blocks(text, abs_start)
    chunks: list[dict] = []
    cur: list[tuple[str, int, int]] = []
    cur_tokens = 0
    idx = 0

    def emit():
        nonlocal cur, cur_tokens, idx
        if not cur:
            return
        body = "\n\n".join(b[0] for b in cur)
        chunks.append(
            {
                "breadcrumb": f"{breadcrumb} [{idx}]",
                "section": section,
                "body": body,
                "char_start": cur[0][1],
                "char_end": cur[-1][2],
            }
        )
        idx += 1
        # Trailing-block overlap for the next chunk (continuity).
        overlap: list[tuple[str, int, int]] = []
        otokens = 0
        for b in reversed(cur):
            btokens = count_tokens(b[0])
            if otokens + btokens > OVERLAP_TOKENS:
                break
            overlap.insert(0, b)
            otokens += btokens
        cur = overlap
        cur_tokens = otokens

    for block in blocks:
        btokens = count_tokens(block[0])
        if cur and cur_tokens + btokens > CHUNK_TOKENS:
            emit()
        cur.append(block)
        cur_tokens += btokens
        # A single oversized atomic block (huge code fence/table) becomes its
        # own chunk — never split mid-block.
        if btokens >= CHUNK_TOKENS:
            emit()
            cur = []
            cur_tokens = 0

    if cur:
        body = "\n\n".join(b[0] for b in cur)
        # Avoid a trailing chunk that is pure overlap repetition of the previous one.
        if not chunks or not chunks[-1]["body"].endswith(body):
            chunks.append(
                {
                    "breadcrumb": f"{breadcrumb} [{idx}]",
                    "section": section,
                    "body": body,
                    "char_start": cur[0][1],
                    "char_end": cur[-1][2],
                }
            )

    # Single chunk after all → drop the [0] suffix.
    if len(chunks) == 1:
        chunks[0]["breadcrumb"] = breadcrumb
    return chunks


def _merge_small(chunks: list[dict]) -> list[dict]:
    """Fold chunks under MIN_CHUNK_TOKENS into an adjacent chunk."""
    if len(chunks) <= 1:
        return chunks

    merged: list[dict] = []
    carry: dict | None = None

    for chunk in chunks:
        if carry is not None:
            chunk = {
                **chunk,
                "body": f"{carry['body']}\n\n{chunk['body']}",
                "char_start": min(carry.get("char_start", chunk["char_start"]), chunk["char_start"]) if carry.get("char_start") else chunk["char_start"],
            }
            carry = None
        if count_tokens(chunk["body"]) < MIN_CHUNK_TOKENS:
            carry = chunk
            continue
        merged.append(chunk)

    if carry is not None:
        if merged:
            merged[-1] = {
                **merged[-1],
                "body": f"{merged[-1]['body']}\n\n{carry['body']}",
                "char_end": max(merged[-1].get("char_end", 0), carry.get("char_end", 0)),
            }
        else:
            merged.append(carry)

    return merged
