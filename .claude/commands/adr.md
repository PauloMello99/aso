# /adr

Create a new Architecture Decision Record in `.memory/adr/`.

## Usage

```
/adr <short-title>
```

Example: `/adr rls-policy-strategy`

## Steps

1. List existing ADRs in `.memory/adr/` to determine the next number (zero-padded 4 digits)
2. Create `.memory/adr/<NNNN>-<short-title>.md` with this structure:

```markdown
# ADR-<NNNN>: <Title>

**Date:** <today>
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXXX

## Context

What is the situation and why does a decision need to be made?

## Decision

What was decided, and why was this option chosen over alternatives?

## Alternatives considered

Brief list of what was ruled out and why.

## Consequences

What changes as a result? What new obligations does this create?
```

3. Add a line to `.memory/recent-decisions.md` in the table:
   `| ADR-<NNNN> | <title> | <date> | Accepted |`

4. Add a line to `.memory/MEMORY.md` index under the ADR section:
   `- [ADR-<NNNN>: <title>](adr/<NNNN>-<short-title>.md) — <one-line hook>`

## Important

ADRs in `.memory/adr/` are git-tracked. Session notes in `.memory/sessions/` are gitignored.
Write ADRs for decisions that are non-obvious or would confuse a future contributor — not for every implementation detail.
