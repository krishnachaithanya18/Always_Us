"""Always Us — Bounded Agent Orchestrator."""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.services.ollama_service import OllamaError, OllamaService, OllamaTimeoutError

logger = logging.getLogger(__name__)

settings = get_settings()


class WorkflowType(str, Enum):
    COMPANION = "companion"
    MEMORY = "memory"
    COMFORT = "comfort"
    SURPRISE = "surprise"


@dataclass
class AgentContext:
    workflow_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    user_message: str = ""
    conversation_history: list[dict[str, str]] = field(default_factory=list)
    retrieved_memories: list[dict[str, Any]] = field(default_factory=list)
    workflow_type: WorkflowType = WorkflowType.COMPANION
    model_calls: int = 0
    agent_used: str = "companion"


@dataclass
class AgentResult:
    content: str
    workflow_id: str
    agent_used: str
    error: str | None = None


# ---------------------------------------------------------------------------
# Memory Agent
# ---------------------------------------------------------------------------


class MemoryAgent:
    """Retrieves relevant memories from the database using simple text search."""

    async def search(self, query: str, db: AsyncSession, limit: int = 3) -> list[dict[str, Any]]:
        from sqlalchemy import or_, select, text
        from app.models import Memory

        q = query.lower().strip()
        if not q:
            return []

        words = [w for w in q.split() if len(w) > 2][:5]
        if not words:
            return []

        try:
            conditions = []
            for word in words:
                conditions.append(Memory.title.ilike(f"%{word}%"))
                conditions.append(Memory.description.ilike(f"%{word}%"))

            stmt = (
                select(Memory)
                .where(or_(*conditions))
                .order_by(Memory.is_favorite.desc(), Memory.memory_date.desc())
                .limit(limit)
            )
            result = await db.execute(stmt)
            memories = result.scalars().all()
            return [
                {
                    "id": m.id,
                    "title": m.title,
                    "description": m.description or "",
                    "date": str(m.memory_date) if m.memory_date else None,
                    "tags": [t.tag for t in m.tags],
                }
                for m in memories
            ]
        except Exception as exc:
            logger.error("MemoryAgent search error: %s", exc)
            return []


# ---------------------------------------------------------------------------
# Comfort Agent
# ---------------------------------------------------------------------------


class ComfortAgent:
    """Produces empathetic, grounded responses for emotional support."""

    SYSTEM = (
        "You are Always, a warm AI companion. The user may be going through a hard time. "
        "Respond with genuine empathy, validate their feelings, and offer gentle encouragement. "
        "Be sincere, not saccharine. If the situation sounds serious, kindly note that talking "
        "to a trusted person in their life can also help. Never pressure or manipulate. "
        "You are an AI — be honest about that if asked."
    )

    async def respond(self, context: AgentContext, ollama: OllamaService) -> str:
        context.model_calls += 1
        return await ollama.chat(context.conversation_history, system=self.SYSTEM)


# ---------------------------------------------------------------------------
# Surprise Agent
# ---------------------------------------------------------------------------


class SurpriseAgent:
    """Retrieves a saved memory or letter as a surprise, or generates a suggestion."""

    async def get_surprise(self, db: AsyncSession, ollama: OllamaService) -> dict[str, Any]:
        import random
        from sqlalchemy import select, func
        from app.models import Memory, Letter

        # 50% chance: random memory
        if random.random() < 0.5:
            stmt = select(Memory).order_by(func.random()).limit(1)
            result = await db.execute(stmt)
            memory = result.scalars().first()
            if memory:
                return {
                    "type": "memory",
                    "id": memory.id,
                    "title": memory.title,
                    "content": memory.description or memory.title,
                    "is_ai_generated": False,
                }

        # 30%: random favorite letter
        stmt = select(Letter).where(Letter.authored_by == "human").order_by(func.random()).limit(1)
        result = await db.execute(stmt)
        letter = result.scalars().first()
        if letter:
            return {
                "type": "letter",
                "id": letter.id,
                "title": letter.title,
                "content": letter.content[:300] + ("…" if len(letter.content) > 300 else ""),
                "is_ai_generated": False,
            }

        # Fallback: AI suggestion
        return {
            "type": "suggestion",
            "id": None,
            "title": "A thought for you",
            "content": "Take a moment today to reflect on something that made you smile recently.",
            "is_ai_generated": True,
        }


# ---------------------------------------------------------------------------
# Companion Agent
# ---------------------------------------------------------------------------


class CompanionAgent:
    """Primary conversational agent for everyday interaction."""

    async def respond(self, context: AgentContext, ollama: OllamaService) -> str:
        context.model_calls += 1
        history = context.conversation_history

        # Inject retrieved memories into context if available
        if context.retrieved_memories:
            memory_text = "\n".join(
                f"- [{m['title']}] {m['description'][:200] if m['description'] else ''}"
                for m in context.retrieved_memories
            )
            system_addition = (
                "\n\nRelevant saved memories you may reference (do not invent details beyond what is listed):\n"
                + memory_text
            )
            from app.services.ollama_service import SYSTEM_PROMPT
            system = SYSTEM_PROMPT + system_addition
        else:
            system = None

        return await ollama.chat(history, system=system)


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


_COMFORT_KEYWORDS = {
    "sad", "crying", "cry", "hurt", "pain", "miss", "alone", "lonely",
    "anxious", "anxious", "scared", "afraid", "depressed", "depression",
    "overwhelmed", "exhausted", "terrible", "awful", "hopeless", "bad day",
    "can't sleep", "cannot sleep", "stressed", "worried",
}

_MEMORY_KEYWORDS = {
    "remember", "memory", "memories", "recall", "that time", "when we",
    "our trip", "our photo", "remind me", "show me", "find",
}

_SURPRISE_KEYWORDS = {
    "surprise", "random", "something special", "cheer me up", "lift my spirits",
}


def _classify_locally(message: str) -> WorkflowType:
    """Deterministic keyword-based classifier — no LLM call needed for most messages."""
    lower = message.lower()
    if any(kw in lower for kw in _SURPRISE_KEYWORDS):
        return WorkflowType.SURPRISE
    if any(kw in lower for kw in _COMFORT_KEYWORDS):
        return WorkflowType.COMFORT
    if any(kw in lower for kw in _MEMORY_KEYWORDS):
        return WorkflowType.MEMORY
    return WorkflowType.COMPANION


class AgentOrchestrator:
    """
    Central controller that routes each request through the appropriate workflow.

    Limits:
    - max_model_calls per request (from settings)
    - bounded conversation history
    - structured error fallbacks
    - no recursive agent loops
    """

    def __init__(self) -> None:
        self._ollama = OllamaService()
        self._companion = CompanionAgent()
        self._comfort = ComfortAgent()
        self._memory_agent = MemoryAgent()
        self._surprise = SurpriseAgent()

    async def process(
        self,
        user_message: str,
        conversation_history: list[dict[str, str]],
        db: AsyncSession,
    ) -> AgentResult:
        max_calls = settings.max_model_calls_per_request
        workflow_id = str(uuid.uuid4())[:8]

        # --- 1. Validate ---
        user_message = user_message.strip()
        if not user_message:
            return AgentResult(
                content="I didn't catch that — could you try again?",
                workflow_id=workflow_id,
                agent_used="companion",
            )

        # --- 2. Bound conversation history ---
        max_hist = settings.max_conversation_messages
        bounded_history = conversation_history[-max_hist:]

        # Build messages list (user message appended)
        messages = [*bounded_history, {"role": "user", "content": user_message}]

        context = AgentContext(
            workflow_id=workflow_id,
            user_message=user_message,
            conversation_history=messages,
        )

        # --- 3. Check Ollama availability ---
        available, reason = await self._ollama.check_availability()
        if not available:
            return AgentResult(
                content=(
                    f"I'm having trouble connecting to the AI right now. "
                    f"({reason}) Please make sure Ollama is running with the "
                    f"`{settings.ollama_model}` model installed, then try again."
                ),
                workflow_id=workflow_id,
                agent_used="offline",
                error=reason,
            )

        # --- 4. Classify request ---
        context.workflow_type = _classify_locally(user_message)

        try:
            # --- 5. Route to workflow ---
            if context.workflow_type == WorkflowType.SURPRISE:
                context.agent_used = "surprise"
                surprise = await self._surprise.get_surprise(db, self._ollama)
                content = (
                    f"✨ Here's something special for you!\n\n"
                    f"**{surprise['title']}**\n\n{surprise['content']}"
                )
                if surprise.get("is_ai_generated"):
                    content += "\n\n*This is an AI-generated suggestion, not a saved memory.*"
                return AgentResult(
                    content=content,
                    workflow_id=workflow_id,
                    agent_used="surprise",
                )

            elif context.workflow_type == WorkflowType.MEMORY:
                context.agent_used = "memory"
                if context.model_calls < max_calls:
                    context.retrieved_memories = await self._memory_agent.search(
                        user_message, db
                    )
                if context.retrieved_memories:
                    response = await self._companion.respond(context, self._ollama)
                else:
                    response = await self._companion.respond(context, self._ollama)
                return AgentResult(
                    content=response,
                    workflow_id=workflow_id,
                    agent_used="memory",
                )

            elif context.workflow_type == WorkflowType.COMFORT:
                context.agent_used = "comfort"
                if context.model_calls < max_calls:
                    response = await self._comfort.respond(context, self._ollama)
                else:
                    response = "I'm here for you. 💙"
                return AgentResult(
                    content=response,
                    workflow_id=workflow_id,
                    agent_used="comfort",
                )

            else:
                # COMPANION (default)
                context.agent_used = "companion"
                if context.model_calls < max_calls:
                    response = await self._companion.respond(context, self._ollama)
                else:
                    response = "I've reached my thinking limit for this message. Please try again!"
                return AgentResult(
                    content=response,
                    workflow_id=workflow_id,
                    agent_used="companion",
                )

        except OllamaTimeoutError as exc:
            logger.warning("Ollama timeout in workflow %s: %s", workflow_id, exc)
            return AgentResult(
                content="The AI took too long to respond this time. Please try again in a moment.",
                workflow_id=workflow_id,
                agent_used=context.agent_used,
                error=str(exc),
            )
        except OllamaError as exc:
            logger.error("Ollama error in workflow %s: %s", workflow_id, exc)
            return AgentResult(
                content=f"I ran into an issue with the AI right now: {exc}",
                workflow_id=workflow_id,
                agent_used=context.agent_used,
                error=str(exc),
            )
        except Exception as exc:
            logger.exception("Unexpected orchestrator error in workflow %s", workflow_id)
            return AgentResult(
                content="Something unexpected happened. Please try again.",
                workflow_id=workflow_id,
                agent_used=context.agent_used,
                error=str(exc),
            )
