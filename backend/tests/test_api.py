"""Tests — health, auth, memories, letters, chat."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["database"] == "ok"
    assert "ollama" in data


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_setup_passcode_first_time(unauth_client: AsyncClient):
    resp = await unauth_client.post("/api/v1/auth/setup", json={"passcode": "SuperSecret123!"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_valid(unauth_client: AsyncClient):
    # Setup first
    await unauth_client.post("/api/v1/auth/setup", json={"passcode": "testpasscode"})
    resp = await unauth_client.post("/api/v1/auth/login", json={"passcode": "testpasscode"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_passcode(unauth_client: AsyncClient):
    await unauth_client.post("/api/v1/auth/setup", json={"passcode": "testpasscode"})
    resp = await unauth_client.post("/api/v1/auth/login", json={"passcode": "wrongpasscode"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_unauthenticated_access_rejected(unauth_client: AsyncClient):
    resp = await unauth_client.get("/api/v1/memories")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["authenticated"] is True


# ---------------------------------------------------------------------------
# Memories
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_memory(client: AsyncClient):
    resp = await client.post(
        "/api/v1/memories",
        json={"title": "Our first date", "description": "It was wonderful", "tags": ["date", "love"]},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Our first date"
    assert "date" in data["tags"]
    assert data["id"]


@pytest.mark.asyncio
async def test_list_memories_empty(client: AsyncClient):
    resp = await client.get("/api/v1/memories")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_get_memory(client: AsyncClient):
    create_resp = await client.post(
        "/api/v1/memories",
        json={"title": "Sunset walk", "tags": []},
    )
    memory_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/memories/{memory_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Sunset walk"


@pytest.mark.asyncio
async def test_update_memory(client: AsyncClient):
    create_resp = await client.post("/api/v1/memories", json={"title": "Old title", "tags": []})
    memory_id = create_resp.json()["id"]

    resp = await client.patch(f"/api/v1/memories/{memory_id}", json={"title": "New title"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "New title"


@pytest.mark.asyncio
async def test_delete_memory(client: AsyncClient):
    create_resp = await client.post("/api/v1/memories", json={"title": "To delete", "tags": []})
    memory_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/memories/{memory_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/memories/{memory_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_memory_not_found(client: AsyncClient):
    resp = await client.get("/api/v1/memories/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_memory_search(client: AsyncClient):
    await client.post("/api/v1/memories", json={"title": "Paris trip", "tags": ["travel"]})
    await client.post("/api/v1/memories", json={"title": "Home cooking", "tags": ["food"]})

    resp = await client.get("/api/v1/memories?search=paris")
    assert resp.status_code == 200
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["title"] == "Paris trip"


@pytest.mark.asyncio
async def test_memory_tag_too_many(client: AsyncClient):
    resp = await client.post(
        "/api/v1/memories",
        json={"title": "Test", "tags": [f"tag{i}" for i in range(25)]},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_memory_oversized_title(client: AsyncClient):
    resp = await client.post(
        "/api/v1/memories",
        json={"title": "x" * 300, "tags": []},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Letters
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_letter(client: AsyncClient):
    resp = await client.post(
        "/api/v1/letters",
        json={"title": "Open when you miss me", "category": "miss_you", "content": "I love you so much."},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["authored_by"] == "human"
    assert data["is_read"] is False


@pytest.mark.asyncio
async def test_delete_letter(client: AsyncClient):
    create_resp = await client.post(
        "/api/v1/letters",
        json={"title": "Test", "content": "Content here"},
    )
    letter_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/letters/{letter_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/letters/{letter_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_mark_letter_read(client: AsyncClient):
    create_resp = await client.post(
        "/api/v1/letters",
        json={"title": "Test read", "content": "Some content"},
    )
    letter_id = create_resp.json()["id"]

    resp = await client.post(f"/api/v1/letters/{letter_id}/mark-read")
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True


@pytest.mark.asyncio
async def test_letter_reveal_date_enforced(client: AsyncClient):
    """A letter with a future reveal date should return 403."""
    from datetime import date, timedelta
    future_date = (date.today() + timedelta(days=30)).isoformat()

    create_resp = await client.post(
        "/api/v1/letters",
        json={"title": "Future letter", "content": "Surprise!", "reveal_date": future_date},
    )
    # The letter won't appear in list (filtered) but GET by ID should be 403
    letter_id = create_resp.json()["id"]
    resp = await client.get(f"/api/v1/letters/{letter_id}")
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_conversation(client: AsyncClient):
    resp = await client.post("/api/v1/chat/conversations", json={"title": "Test Chat"})
    assert resp.status_code == 201
    assert resp.json()["title"] == "Test Chat"


@pytest.mark.asyncio
async def test_list_conversations(client: AsyncClient):
    await client.post("/api/v1/chat/conversations", json={"title": "Conv 1"})
    await client.post("/api/v1/chat/conversations", json={"title": "Conv 2"})

    resp = await client.get("/api/v1/chat/conversations")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 2


@pytest.mark.asyncio
async def test_send_message_ollama_unavailable(client: AsyncClient):
    """When Ollama is down, the API still responds with a graceful message (not 5xx)."""
    with patch(
        "app.agents.AgentOrchestrator._ollama",
    ):
        with patch(
            "app.services.ollama_service.OllamaService.check_availability",
            new_callable=AsyncMock,
            return_value=(False, "Cannot connect to Ollama"),
        ):
            resp = await client.post(
                "/api/v1/chat/send",
                json={"message": "Hello!"},
            )
    assert resp.status_code == 201
    data = resp.json()
    # The assistant message should mention the connectivity issue
    assert "ollama" in data["assistant_message"]["content"].lower() or \
           "connect" in data["assistant_message"]["content"].lower() or \
           "ai" in data["assistant_message"]["content"].lower()


@pytest.mark.asyncio
async def test_send_empty_message(client: AsyncClient):
    resp = await client.post("/api/v1/chat/send", json={"message": "   "})
    # Pydantic min_length=1 should reject after strip, or orchestrator handles it
    assert resp.status_code in (201, 422)


@pytest.mark.asyncio
async def test_send_oversized_message(client: AsyncClient):
    resp = await client.post("/api/v1/chat/send", json={"message": "x" * 5000})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_delete_conversation(client: AsyncClient):
    create_resp = await client.post("/api/v1/chat/conversations", json={"title": "To delete"})
    conv_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/chat/conversations/{conv_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/chat/conversations/{conv_id}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_settings_update_and_get(client: AsyncClient):
    resp = await client.put(
        "/api/v1/settings",
        json={"settings": [
            {"key": "partner_name", "value": "[Partner Name]"},
            {"key": "anniversary_date", "value": "2020-10-10"},
        ]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["settings"]["partner_name"] == "[Partner Name]"
    assert data["settings"]["anniversary_date"] == "2020-10-10"


@pytest.mark.asyncio
async def test_settings_disallowed_key(client: AsyncClient):
    resp = await client.put(
        "/api/v1/settings",
        json={"settings": [{"key": "secret_backdoor", "value": "evil"}]},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_public_settings_no_auth(unauth_client: AsyncClient):
    resp = await unauth_client.get("/api/v1/settings/public")
    assert resp.status_code == 200
