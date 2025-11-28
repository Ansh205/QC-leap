import os
import sys
from unittest.mock import patch, MagicMock

import pytest
from fastapi import status
from pydantic import BaseModel

# Ensure backend root on path (if not already via conftest)
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.core.config import settings

CHATBOT_URL = f"{settings.API_V1_PREFIX}/chatbot"

# The target for patching is the imported 'chat' function
# within the API router file (app/api/v1/chatbot.py)
CHATBOT_FUNCTION_PATH = "app.api.v1.chatbot.chat"


@pytest.mark.asyncio
# Using the authorized client to fix 401 Unauthorized errors
async def test_chatbot_health_ok(authorized_async_client):
    """
    Check if chatbot health endpoint responds with 200 and a JSON body
    that indicates availability and a human-readable message.
    """
    response = await authorized_async_client.get(f"{CHATBOT_URL}/health")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # API currently returns: {"available": True, "message": "Chatbot is ready"}
    assert isinstance(data, dict)
    assert data.get("available") is True
    # if you want to be less strict, only check that message is a string:
    # assert isinstance(data.get("message"), str)
    assert data.get("message") == "Chatbot is ready"


@patch(CHATBOT_FUNCTION_PATH)
@pytest.mark.asyncio
# Using the authorized client to fix 401 Unauthorized errors
async def test_chatbot_chat_success(mock_chat_function, authorized_async_client):
    """
    Test POST /chat endpoint success scenario by mocking the service function.

    The service function returns a dict like:
        {"response": "<text>"}

    The API endpoint currently forwards that dict as-is.
    """
    expected_text = "Hello! This is a mock reply from Jemih."
    mock_chat_function.return_value = {"response": expected_text}

    payload = {
        "session_id": "session-123",
        "message": "How many models do I have?"
    }

    # Act
    response = await authorized_async_client.post(f"{CHATBOT_URL}/chat", json=payload)

    # Assert
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # API currently returns the full dict, not just the string
    assert isinstance(data, dict)
    assert "response" in data
    assert data["response"] == expected_text

    # Verify the mocked function was called once
    mock_chat_function.assert_called_once()

    # Verify the arguments passed to the mock function:
    # The function signature is `chat(request: ChatRequest, db=None, user=None)`
    # The API endpoint calls it as `chat(payload_model)`
    call_args = mock_chat_function.call_args[0][0]
    assert call_args.session_id == payload["session_id"]
    assert call_args.message == payload["message"]


@pytest.mark.asyncio
# Using the authorized client to fix 401 Unauthorized errors
async def test_chatbot_chat_validation_error(authorized_async_client):
    """
    Test POST /chat returns 422 Unprocessable Entity when required fields are missing.
    """
    payload = {
        "session_id": "session-123"
        # "message" is missing, which is required by the ChatRequest schema
    }

    # Act
    response = await authorized_async_client.post(f"{CHATBOT_URL}/chat", json=payload)

    # Assert
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "detail" in data

    # Verify the specific field causing the validation error
    error_fields = [error.get("loc")[-1] for error in data["detail"]]
    assert "message" in error_fields
