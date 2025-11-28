# backend/tests/test_upload_masks.py

import os
import sys
from unittest.mock import MagicMock, patch, mock_open
import pytest
import httpx
from httpx import ASGITransport
from fastapi import status

# ------- PATH FIX -------
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# ------- IMPORT APP -------
from app.main import app
from app.database import get_db
from app.core.deps import get_current_active_user

# ---------------- Dependency Overrides ----------------
shared_db = MagicMock()

def override_get_db():
    yield shared_db

app.dependency_overrides[get_db] = override_get_db

mock_user = MagicMock()
mock_user.id = 1
mock_user.is_active = True

def override_user():
    return mock_user

app.dependency_overrides[get_current_active_user] = override_user

# ---------------- HTTPX CLIENT ----------------
@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

# -------------------- Files --------------------
VALID_FILE = ("mask.png", b"DATA", "image/png")
INVALID_EXT = ("mask.txt", b"DATA", "text/plain")
INVALID_PNG = ("mask.png", b"BAD_DATA", "image/png")

MIXED_FILES = [
    ("good.png", b"DATA", "image/png"),
    ("bad.png", b"BAD", "image/png"),
]

IMAGES_API = "app.api.v1.images"


# ---------------------------------------------------------
# Helper: Fake model factory
# ---------------------------------------------------------
def fake_model(owner_id=1):
    m = MagicMock()
    m.id = 1
    m.owner_id = owner_id
    return m


# =========================================================
# 1️⃣ SUCCESS
# =========================================================
@patch(f"{IMAGES_API}.validate_image_file", return_value=True)
@patch(f"{IMAGES_API}.os.makedirs")
@patch(f"{IMAGES_API}.open", new_callable=mock_open)
async def test_upload_masks_success(mock_file, mock_makedirs, mock_validate, client):
    shared_db.query.return_value.filter.return_value.first.return_value = fake_model()

    response = await client.post(
        "/api/v1/images/1/upload-masks",
        files={"files": VALID_FILE},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Uploaded 1 mask files"
    assert len(response.json()["masks"]) == 1


# =========================================================
# 2️⃣ INVALID EXTENSION (PNG filtering)
# =========================================================
@patch(f"{IMAGES_API}.validate_image_file", return_value=True)
@patch(f"{IMAGES_API}.os.makedirs")
@patch(f"{IMAGES_API}.open", new_callable=mock_open)
async def test_upload_masks_invalid_extension(mock_file, mock_makedirs, mock_validate, client):
    shared_db.query.return_value.filter.return_value.first.return_value = fake_model()

    response = await client.post(
        "/api/v1/images/1/upload-masks",
        files={"files": INVALID_EXT},
    )

    assert response.status_code == 200
    assert len(response.json()["masks"]) == 0


# =========================================================
# 3️⃣ MODEL NOT FOUND (404)
# =========================================================
@patch(f"{IMAGES_API}.os.makedirs")
async def test_upload_masks_model_not_found(mock_makedirs, client):
    shared_db.query.return_value.filter.return_value.first.return_value = None

    response = await client.post(
        "/api/v1/images/999/upload-masks",
        files={"files": VALID_FILE},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Inspection model not found"


# =========================================================
# 4️⃣ FORBIDDEN — Wrong owner
# =========================================================
@patch(f"{IMAGES_API}.os.makedirs")
async def test_upload_masks_forbidden(mock_makedirs, client):
    shared_db.query.return_value.filter.return_value.first.return_value = fake_model(owner_id=2)

    response = await client.post(
        "/api/v1/images/1/upload-masks",
        files={"files": VALID_FILE},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Only the model owner can upload masks"


# =========================================================
# 5️⃣ INVALID PNG CONTENT (validate_image_file returns False)
# =========================================================
@patch(f"{IMAGES_API}.os.remove")
@patch(f"{IMAGES_API}.validate_image_file", return_value=False)
@patch(f"{IMAGES_API}.os.makedirs")
@patch(f"{IMAGES_API}.open", new_callable=mock_open)
async def test_upload_masks_invalid_png(mock_file, mock_makedirs, mock_validate, mock_remove, client):
    shared_db.query.return_value.filter.return_value.first.return_value = fake_model()

    response = await client.post(
        "/api/v1/images/1/upload-masks",
        files={"files": INVALID_PNG},
    )

    assert response.status_code == 200
    assert len(response.json()["masks"]) == 0


# =========================================================
# 6️⃣ MIXED FILES (some valid, some invalid)
# =========================================================
@patch(f"{IMAGES_API}.os.remove")
@patch(f"{IMAGES_API}.validate_image_file", side_effect=[True, False])
@patch(f"{IMAGES_API}.os.makedirs")
@patch(f"{IMAGES_API}.open", new_callable=mock_open)
async def test_upload_masks_mixed(mock_file, mock_makedirs, mock_validate, mock_remove, client):
    shared_db.query.return_value.filter.return_value.first.return_value = fake_model()

    file_list = [("files", f) for f in MIXED_FILES]

    response = await client.post(
        "/api/v1/images/1/upload-masks",
        files=file_list,
    )

    assert response.status_code == 200
    assert len(response.json()["masks"]) == 1


# =========================================================
# 7️⃣ NO FILES SENT → FastAPI Validation Error 422
# =========================================================
async def test_upload_masks_no_files(client):
    shared_db.query.return_value.filter.return_value.first.return_value = fake_model()

    response = await client.post("/api/v1/images/1/upload-masks", files={})

    assert response.status_code == 422


# =========================================================
# 8️⃣ PATH SANITIZATION — nested folder names removed
# =========================================================
@patch(f"{IMAGES_API}.validate_image_file", return_value=True)
@patch(f"{IMAGES_API}.os.makedirs")
@patch(f"{IMAGES_API}.open", new_callable=mock_open)
async def test_upload_masks_filename_sanitization(mock_file, mock_makedirs, mock_validate, client):
    shared_db.query.return_value.filter.return_value.first.return_value = fake_model()

    response = await client.post(
        "/api/v1/images/1/upload-masks",
        files={"files": ("folder/inner/mask.png", b"DATA", "image/png")},
    )

    assert response.status_code == 200
    mask = response.json()["masks"][0]["filename"]
    assert mask == "mask.png"  # sanitized OK
