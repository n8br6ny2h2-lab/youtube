"""Claude API istemcisi (yapılandırılmış JSON çıktısı, maliyet kaydı, bütçe koruması).

ANTHROPIC_API_KEY yoksa veya bütçe doluysa `available()` False döner ve çağıran modül
yerel (ücretsiz) motoruna düşer.
"""
from __future__ import annotations

import json
from typing import Any

from loguru import logger
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from . import costs
from .config import has_key, settings

try:
    import anthropic
except ImportError:  # pragma: no cover
    anthropic = None  # type: ignore


class LLMUnavailable(RuntimeError):
    pass


def available() -> bool:
    cfg = settings()["llm"]
    return anthropic is not None and cfg.get("provider", "auto") in {"auto", "claude"} and has_key("ANTHROPIC_API_KEY")


_client = None


def client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(max_retries=2, timeout=600)
    return _client


def _retryable() -> tuple:
    if anthropic is None:
        return (RuntimeError,)
    return (anthropic.RateLimitError, anthropic.APIConnectionError, anthropic.InternalServerError)


@retry(
    retry=retry_if_exception_type(_retryable()),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=4, max=60),
    reraise=True,
)
def generate_json(system: str, prompt: str, schema: dict, purpose: str, estimate_usd: float = 0.25) -> dict[str, Any]:
    """Şemaya uygun JSON üretir. Hata veya reddetme durumunda LLMUnavailable fırlatır."""
    if not available():
        raise LLMUnavailable("ANTHROPIC_API_KEY tanımlı değil")
    costs.check(estimate_usd)
    cfg = settings()["llm"]
    model = cfg["model"]
    params = dict(
        model=model,
        max_tokens=int(cfg.get("max_tokens", 32000)),
        system=system,
        messages=[{"role": "user", "content": prompt}],
        output_config={"effort": cfg.get("effort", "medium"), "format": {"type": "json_schema", "schema": schema}},
    )
    try:
        # Güvenlik sınıflandırıcısı reddederse sunucu tarafı yedek modele geçiş (fallbacks="default").
        with client().beta.messages.stream(betas=["server-side-fallback-2026-07-01"], fallbacks="default", **params) as stream:
            msg = stream.get_final_message()
    except (TypeError, anthropic.BadRequestError) as exc:
        logger.warning(f"Fallback parametresi kabul edilmedi, standart istek deneniyor: {exc}")
        with client().messages.stream(**params) as stream:
            msg = stream.get_final_message()

    usage = msg.usage
    usd = costs.llm_cost(model, usage.input_tokens or 0, usage.output_tokens or 0)
    costs.record("claude", purpose, (usage.input_tokens or 0) + (usage.output_tokens or 0), usd, model)

    if msg.stop_reason == "refusal":
        raise LLMUnavailable("Model isteği reddetti")
    if msg.stop_reason == "max_tokens":
        raise LLMUnavailable("Yanıt max_tokens sınırında kesildi")
    text = next((b.text for b in msg.content if getattr(b, "type", "") == "text"), "")
    return json.loads(text)
