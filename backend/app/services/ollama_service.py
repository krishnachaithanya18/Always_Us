"""Always Us — Ollama client service."""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Always, a warm and thoughtful AI companion created as a personalized anniversary gift. You were built with love to support meaningful conversations, help reflect on cherished memories, and offer gentle encouragement.

Your personality:
- Warm, sincere, empathetic, and conversational
- Thoughtful and reflective — you help process feelings and celebrate moments
- Encouraging without being pushy or saccharine
- Honest about being an AI companion — never pretend to be a real person
- Respectful of boundaries and emotional wellbeing

Important boundaries:
- Always be transparent that you are an AI companion, not a human
- Never impersonate or speak as if you are the person's boyfriend/partner
- Do not fabricate relationship memories or invent specific events
- If the user seems in genuine distress, acknowledge their feelings and gently encourage real human support
- Do not pressure the user into emotional dependence
- Keep conversations warm but healthy

You can help with:
- Everyday conversation and reflection
- Encouragement and positive reinforcement
- Discussing saved memories when they are shared with you
- Relationship-themed writing and letters
- Thoughtful questions and journaling prompts
- Celebrating moments together"""


class OllamaError(Exception):
    """Raised when Ollama is unavailable or returns an error."""


class OllamaTimeoutError(OllamaError):
    """Raised when the Ollama request times out."""


class OllamaService:
    """Thin async wrapper around the Ollama /api/chat endpoint."""

    def __init__(self) -> None:
        self._settings = get_settings()

    @property
    def base_url(self) -> str:
        return self._settings.ollama_base_url

    @property
    def model(self) -> str:
        return self._settings.ollama_model

    @property
    def timeout(self) -> int:
        return self._settings.ollama_timeout

    async def check_availability(self) -> tuple[bool, str]:
        """Check if Ollama is reachable and the model is available."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                if resp.status_code != 200:
                    return False, f"Ollama returned HTTP {resp.status_code}"
                data = resp.json()
                models = [m["name"] for m in data.get("models", [])]
                model_available = any(
                    m.startswith(self.model.split(":")[0]) for m in models
                )
                if not model_available:
                    return (
                        False,
                        f"Model '{self.model}' not found. Available: {', '.join(models) or 'none'}",
                    )
                return True, "ok"
        except httpx.ConnectError:
            return False, "Cannot connect to Ollama. Is it running at " + self.base_url + "?"
        except httpx.TimeoutException:
            return False, "Ollama health check timed out"
        except Exception as exc:
            return False, f"Unexpected error: {exc}"

    async def chat(
        self,
        messages: list[dict[str, str]],
        system: str | None = None,
    ) -> str:
        """Send a chat request to Ollama and return the assistant's reply."""
        effective_system = system or SYSTEM_PROMPT
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": "system", "content": effective_system}, *messages],
            "stream": False,
            "options": {
                "num_predict": self._settings.max_response_tokens,
                "temperature": 0.75,
            },
        }

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout)
            ) as client:
                resp = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                )
                if resp.status_code != 200:
                    raise OllamaError(
                        f"Ollama returned HTTP {resp.status_code}: {resp.text[:200]}"
                    )
                data = resp.json()
                content = data.get("message", {}).get("content", "")
                if not content:
                    raise OllamaError("Ollama returned an empty response")
                return content

        except httpx.ConnectError as exc:
            raise OllamaError(
                "Cannot connect to Ollama. Please start Ollama and ensure the model is installed."
            ) from exc
        except httpx.TimeoutException as exc:
            raise OllamaTimeoutError(
                "The AI took too long to respond. Please try again."
            ) from exc
        except OllamaError:
            raise
        except Exception as exc:
            logger.exception("Unexpected error during Ollama request")
            raise OllamaError(f"Unexpected AI error: {exc}") from exc

    async def classify(self, text: str, categories: list[str]) -> str:
        """Use Ollama to classify text into one of the given categories."""
        prompt = (
            f"Classify the following message into exactly one of these categories: "
            f"{', '.join(categories)}.\n\n"
            f"Message: {text}\n\n"
            f"Respond with only the category name, nothing else."
        )
        result = await self.chat(
            [{"role": "user", "content": prompt}],
            system="You are a text classifier. Respond with exactly one word from the given list.",
        )
        # Normalize
        normalized = result.strip().lower().split()[0] if result.strip() else categories[0]
        return normalized if normalized in categories else categories[0]
