#!/usr/bin/env bash
# Re-indexes .memory/ + docs/ incrementally into Qdrant.
# Called by the Claude Code hooks (SessionStart / Stop / PostToolUse on .memory writes).
# Uses the dedicated WSL venv so it never resolves to a Windows pyenv shim.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PY="$HOME/ink-ops-rag-venv/bin/python"

if [ ! -x "$VENV_PY" ]; then
  echo "[rag] venv not found at $VENV_PY — run setup first (see /rag-setup):" >&2
  echo "  python3 -m venv ~/ink-ops-rag-venv" >&2
  echo "  ~/ink-ops-rag-venv/bin/python -m pip install -r bin/scripts/rag/requirements.txt" >&2
  exit 1
fi

"$VENV_PY" "$SCRIPT_DIR/index.py" --no-recreate
