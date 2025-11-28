import os
import sys
import pytest
import httpx
from httpx import ASGITransport
from unittest.mock import MagicMock

# --- Ensure backend root on sys.path ---
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.main import app
from app.database import get_db
from app.core.config import settings
# Assuming your authentication dependency is here
from app.core.deps import get_current_user 
# Import the User model structure for accurate mocking
from app.models.user import User 

# Global config tweaks for tests
settings.REDIS_URL = "redis://redis:6379/0"

# --- 1. Database Dependency Override ---
def override_get_db():
    """Mocks the database session for dependency injection."""
    mock_db_session = MagicMock()
    try:
        yield mock_db_session
    finally:
        pass

# Apply the database override
app.dependency_overrides[get_db] = override_get_db


# --- 2. Mock User Fixture ---
@pytest.fixture
def test_user_mock() -> User:
    """Returns a mock User object to simulate a logged-in user."""
    # We need to mock the User object structure that `get_current_user` usually returns.
    # We use a simple object with required attributes (like id)
    mock_user = MagicMock(spec=User)
    mock_user.id = 1
    mock_user.email = "test.user@example.com"
    mock_user.is_active = True
    mock_user.is_superuser = False
    mock_user.company_id = 1
    return mock_user


# --- 3. Authentication Dependency Override ---
def override_get_current_user(user: User):
    """
    Overrides the actual authentication logic to always return a mock user.
    This bypasses the need for JWT token generation and validation in tests.
    """
    # Note: This function takes the fixture as an argument for easier testing integration.
    # The return value is handled by the fixture that calls this function.
    return user


# --- 4. Core Async Client Fixture ---
@pytest.fixture
async def async_client():
    """Standard unauthenticated client."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# --- 5. Authorized Async Client Fixture (The fix for the ERROR) ---
@pytest.fixture
async def authorized_async_client(async_client: httpx.AsyncClient, test_user_mock: User):
    """
    An asynchronous test client that overrides the authentication dependency 
    to simulate a logged-in user. This is the client your tests should use.
    """
    # Temporarily apply the authentication override
    app.dependency_overrides[get_current_user] = lambda: override_get_current_user(test_user_mock)
    
    try:
        yield async_client
    finally:
        # Crucial: remove the override to prevent contamination of other tests
        app.dependency_overrides.pop(get_current_user)