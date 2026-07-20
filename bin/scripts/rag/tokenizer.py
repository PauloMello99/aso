"""Token counting for chunking, using bge-m3's tokenizer (XLM-RoBERTa).

The HF `tokenizers` package loads the tokenizer from a local cache
(`.rag/tokenizer/xlm-roberta.json`); on first use it is fetched from the HF hub
and saved there (run during /rag-setup, never inside hooks). If neither works
(offline, package missing), falls back to a chars/3.3 approximation — chunking
still functions, only less precisely.
"""
from pathlib import Path

_CACHE = Path(__file__).resolve().parents[3] / ".rag" / "tokenizer" / "xlm-roberta.json"
_FALLBACK_CHARS_PER_TOKEN = 3.3

_tokenizer = None
_load_failed = False


def _get():
    global _tokenizer, _load_failed
    if _tokenizer is not None or _load_failed:
        return _tokenizer
    try:
        from tokenizers import Tokenizer
    except ImportError:
        _load_failed = True
        return None
    try:
        if _CACHE.is_file():
            _tokenizer = Tokenizer.from_file(str(_CACHE))
        else:
            _tokenizer = Tokenizer.from_pretrained("xlm-roberta-base")
            _CACHE.parent.mkdir(parents=True, exist_ok=True)
            _tokenizer.save(str(_CACHE))
    except Exception:
        _load_failed = True
        return None
    return _tokenizer


def count_tokens(text: str) -> int:
    tok = _get()
    if tok is not None:
        try:
            return len(tok.encode(text, add_special_tokens=False).ids)
        except Exception:
            pass
    return max(1, int(len(text) / _FALLBACK_CHARS_PER_TOKEN))


def using_fallback() -> bool:
    """True when the real tokenizer could not be loaded (approximation mode)."""
    return _get() is None
