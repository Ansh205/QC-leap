import os
import sys
from unittest.mock import MagicMock, patch, ANY

import pytest
import httpx
from httpx import ASGITransport
from fastapi import status

# --- Ensure backend root is on sys.path ---

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.main import app
from app.core.config import settings
from app.database import get_db
from app.schemas.user import UserResponse
from app.schemas.token import Token

# ----------------- Global test setup -----------------

settings.REDIS_URL = "redis://redis:6379/0"
settings.ACCESS_TOKEN_EXPIRE_MINUTES = 60

def override_get_db():
    """Mock database dependency function, yields a mock session."""
    mock_db_session = MagicMock()
    try:
        yield mock_db_session
    finally:
        pass

app.dependency_overrides[get_db] = override_get_db

AUTH_URL = f"{settings.API_V1_PREFIX}/auth"
USER_SERVICE_PATCH_PATH = "app.api.v1.auth.user_service"

# ----------------- HTTPX async client fixture -----------------

@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

# ----------------- Helper Data -----------------

VALID_USER_DATA = {
    "email": "test@example.com",
    "username": "testuser",
    "full_name": "Test User",
    "password": "securepassword123",
    "is_company_admin": False,
    "company_data": None,
}

VALID_ADMIN_DATA = {
    "email": "admin@example.com",
    "username": "adminuser",
    "full_name": "Admin User",
    "password": "securepassword123",
    "is_company_admin": True,
    "company_data": {
        "name": "Test Company",
        "description": "A testing company",
        "industry": "Tech",
    },
}

MOCK_USER_RESPONSE = UserResponse(
    id=1,
    email="test@example.com",
    username="testuser",
    full_name="Test User",
    is_active=True,
    role="MEMBER",  # must match your enum: COMPANY_ADMIN or MEMBER
    permission="INSPECT_ONLY",
    company_id=None,
    created_at="2025-11-28T06:32:46.122Z",
    company=None,
)

# ----------------- /register Tests -----------------

@patch(USER_SERVICE_PATCH_PATH)
async def test_register_success(mock_user_service, async_client):
    """Test successful user registration."""
    mock_user_service.get_by_email.return_value = None
    mock_user_service.get_by_username.return_value = None
    mock_user_service.create.return_value = MOCK_USER_RESPONSE

    response = await async_client.post(f"{AUTH_URL}/register", json=VALID_USER_DATA)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == VALID_USER_DATA["email"]
    assert data["username"] == VALID_USER_DATA["username"]
    mock_user_service.create.assert_called_once()


@patch(USER_SERVICE_PATCH_PATH)
async def test_register_email_exists(mock_user_service, async_client):
    """Test registration failure when email is already registered (400)."""
    mock_user_service.get_by_email.return_value = MagicMock()  # email exists
    mock_user_service.get_by_username.return_value = None

    response = await async_client.post(f"{AUTH_URL}/register", json=VALID_USER_DATA)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Email already registered"


@patch(USER_SERVICE_PATCH_PATH)
async def test_register_username_exists(mock_user_service, async_client):
    """Test registration failure when username is already taken (400)."""
    mock_user_service.get_by_email.return_value = None
    mock_user_service.get_by_username.return_value = MagicMock()  # username exists

    response = await async_client.post(f"{AUTH_URL}/register", json=VALID_USER_DATA)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Username already taken"


@patch(USER_SERVICE_PATCH_PATH)
async def test_register_admin_missing_company_data(mock_user_service, async_client):
    """Test registration failure for admin without company data (400)."""
    # Make sure email and username are considered "not taken"
    mock_user_service.get_by_email.return_value = None
    mock_user_service.get_by_username.return_value = None

    invalid_admin_data = VALID_ADMIN_DATA.copy()
    invalid_admin_data["company_data"] = None

    response = await async_client.post(f"{AUTH_URL}/register", json=invalid_admin_data)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == (
        "Company data required when creating company admin account"
    )

    # Optionally ensure we never try to actually create the user
    mock_user_service.create.assert_not_called()

# ----------------- /login Tests -----------------

@patch(USER_SERVICE_PATCH_PATH)
async def test_login_success_username(mock_user_service, async_client):
    """Test successful login using username."""
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.is_active = True
    mock_user_service.authenticate.return_value = mock_user

    login_data = {
        "username": VALID_USER_DATA["username"],
        "password": VALID_USER_DATA["password"],
    }

    response = await async_client.post(f"{AUTH_URL}/login", data=login_data)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    Token.model_validate(data)
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    mock_user_service.authenticate.assert_called_once_with(
        db=ANY,
        username_or_email=login_data["username"],
        password=login_data["password"],
    )


@patch(USER_SERVICE_PATCH_PATH)
async def test_login_invalid_credentials(mock_user_service, async_client):
    """Test login failure with incorrect credentials (401)."""
    mock_user_service.authenticate.return_value = None

    login_data = {
        "username": "wronguser",
        "password": "wrongpassword",
    }

    response = await async_client.post(f"{AUTH_URL}/login", data=login_data)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Incorrect username/email or password"
    assert "WWW-Authenticate" in response.headers


@patch(USER_SERVICE_PATCH_PATH)
async def test_login_inactive_user(mock_user_service, async_client):
    """Test login failure for an inactive user (400)."""
    mock_inactive_user = MagicMock()
    mock_inactive_user.id = 2
    mock_inactive_user.is_active = False
    mock_user_service.authenticate.return_value = mock_inactive_user

    login_data = {
        "username": "inactiveuser",
        "password": "password",
    }

    response = await async_client.post(f"{AUTH_URL}/login", data=login_data)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Inactive user"
