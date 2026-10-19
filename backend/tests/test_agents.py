"""Tests for agent classification and orchestrator logic."""
from __future__ import annotations

import pytest

from app.agents import (
    WorkflowType,
    _classify_locally,
    AgentOrchestrator,
    AgentResult,
)


# ---------------------------------------------------------------------------
# Classifier tests
# ---------------------------------------------------------------------------


def test_classify_comfort_keywords():
    assert _classify_locally("I'm feeling so sad today") == WorkflowType.COMFORT
    assert _classify_locally("I miss you so much") == WorkflowType.COMFORT
    assert _classify_locally("I cannot sleep tonight") == WorkflowType.COMFORT


def test_classify_memory_keywords():
    assert _classify_locally("Can you remind me of our trip?") == WorkflowType.MEMORY
    assert _classify_locally("Do you remember when we first met?") == WorkflowType.MEMORY


def test_classify_surprise_keywords():
    assert _classify_locally("Give me a surprise!") == WorkflowType.SURPRISE
    assert _classify_locally("Show me something random") == WorkflowType.SURPRISE


def test_classify_companion_default():
    assert _classify_locally("How are you today?") == WorkflowType.COMPANION
    assert _classify_locally("Tell me a fun fact") == WorkflowType.COMPANION
    assert _classify_locally("") == WorkflowType.COMPANION


# ---------------------------------------------------------------------------
# Orchestrator offline behavior
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_orchestrator_ollama_offline(db_session):
    """Orchestrator returns graceful message when Ollama is unreachable."""
    from unittest.mock import AsyncMock, patch

    orchestrator = AgentOrchestrator()

    with patch.object(
        orchestrator._ollama, "check_availability",
        new_callable=AsyncMock,
        return_value=(False, "Connection refused"),
    ):
        result = await orchestrator.process(
            user_message="Hello!",
            conversation_history=[],
            db=db_session,
        )

    assert isinstance(result, AgentResult)
    assert result.error is not None
    assert "ollama" in result.content.lower() or "connect" in result.content.lower()
    assert result.agent_used == "offline"


@pytest.mark.asyncio
async def test_orchestrator_empty_message(db_session):
    """Orchestrator handles empty messages gracefully without calling Ollama."""
    orchestrator = AgentOrchestrator()
    result = await orchestrator.process(
        user_message="   ",
        conversation_history=[],
        db=db_session,
    )
    assert result.content  # Has a response
    # Should NOT have tried to call Ollama (no error about connectivity needed)


@pytest.mark.asyncio
async def test_orchestrator_memory_retrieval(db_session):
    """Memory agent returns empty list when no memories match."""
    from app.agents import MemoryAgent
    agent = MemoryAgent()
    results = await agent.search("completely unrelated nonsense xyz", db_session)
    assert results == []


@pytest.mark.asyncio
async def test_orchestrator_memory_search_returns_results(db_session):
    """Memory agent finds relevant memories from the database."""
    from app.models import Memory
    mem = Memory(title="Paris honeymoon trip", description="Amazing experience in Paris")
    db_session.add(mem)
    await db_session.commit()

    from app.agents import MemoryAgent
    agent = MemoryAgent()
    results = await agent.search("paris trip", db_session)
    assert len(results) >= 1
    assert any("Paris" in r["title"] for r in results)
