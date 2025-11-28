import os
import sys
import types
import json

import pytest
from fastapi import status
from fastapi.exceptions import ResponseValidationError

# Ensure backend root on path
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.core.config import settings  # noqa: E402

COMPANY_URL = f"{settings.API_V1_PREFIX}/company"


async def _get_client(maybe_async_gen):
    """
    Support both:
    - direct AsyncClient fixture
    - async generator fixture (strict asyncio mode)
    """
    if isinstance(maybe_async_gen, types.AsyncGeneratorType) or hasattr(
        maybe_async_gen, "__anext__"
    ):
        return await maybe_async_gen.__anext__()
    return maybe_async_gen


@pytest.mark.asyncio
async def test_get_my_company_raises_response_validation_error(authorized_async_client):
    """
    GET /api/v1/company/me

    Current behavior (with the mocked DB used in tests):
    - The endpoint tries to return a CompanyResponse Pydantic model.
    - The DB layer returns MagicMock-based attributes (name, description, industry),
      which are NOT valid strings.
    - FastAPI + Pydantic response validation fails and raises ResponseValidationError.

    This test documents that mismatch between the intended schema and
    the actual mocked data being returned.
    """
    client = await _get_client(authorized_async_client)

    with pytest.raises(ResponseValidationError):
        await client.get(f"{COMPANY_URL}/me")


@pytest.mark.asyncio
async def test_update_my_company_forbidden_for_non_admin(authorized_async_client):
    """
    PUT /api/v1/company/me

    According to the docs: "company admin only".
    With the current test user (non-admin), the endpoint should return 403.
    """
    client = await _get_client(authorized_async_client)

    payload = {
        "name": "Updated Company Name",
        "description": "Updated description from test.",
        "industry": "Manufacturing",
        "is_active": True,
    }

    response = await client.put(
        f"{COMPANY_URL}/me",
        params={"current_password": "dummy"},  # value doesn't matter for non-admin
        json=payload,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_get_company_members_forbidden_for_non_admin(authorized_async_client):
    """
    GET /api/v1/company/members

    Endpoint is company admin only.
    The current authorized test user is not a company admin, so we expect 403.
    """
    client = await _get_client(authorized_async_client)

    response = await client.get(f"{COMPANY_URL}/members")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_update_member_permission_forbidden_for_non_admin(authorized_async_client):
    """
    PUT /api/v1/company/members/{user_id}/permission

    This is also restricted to company admin.
    With the current non-admin user, we expect 403.
    """
    client = await _get_client(authorized_async_client)

    # Use a dummy user_id; it won't be reached due to permission failure
    target_user_id = 1
    payload = {
        "permission": "INSPECT_ONLY",
        "current_password": "dummy",
    }

    response = await client.put(
        f"{COMPANY_URL}/members/{target_user_id}/permission",
        json=payload,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_remove_member_from_company_forbidden_for_non_admin(authorized_async_client):
    """
    DELETE /api/v1/company/members/{user_id}

    Also restricted to company admin.
    Expect 403 for the current non-admin user.
    """
    client = await _get_client(authorized_async_client)

    target_user_id = 1
    payload = {
        "current_password": "dummy",
    }

    #
