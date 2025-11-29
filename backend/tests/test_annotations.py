# backend/tests/test_annotations.py
import os
import sys
import json
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
from app.core.deps import get_current_active_user
from app.models.image import Image
from app.models.inspection_model import InspectionModel
from app.models.annotation import AnnotationType

# test settings adjustments
settings.REDIS_URL = "redis://redis:6379/0"
settings.ACCESS_TOKEN_EXPIRE_MINUTES = 60

# -------------------------------------------------------------------------
# Single shared MagicMock DB used by the dependency override
# -------------------------------------------------------------------------
shared_mock_db = MagicMock()

def override_get_db():
    try:
        yield shared_mock_db
    finally:
        pass

app.dependency_overrides[get_db] = override_get_db

# -------------------------------------------------------------------------
# Mock current active user dependency
# -------------------------------------------------------------------------
mock_current_user = MagicMock()
mock_current_user.id = 1
mock_current_user.is_active = True

def override_current_user():
    return mock_current_user

app.dependency_overrides[get_current_active_user] = override_current_user

# Path used to patch annotation service functions in the router
ANNOTATION_SERVICE_PATCH_PATH = "app.api.v1.annotations.annotation_service"

# ----------------- HTTPX async client fixture -----------------
@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

# ----------------- Helper values -----------------
CANVAS_OBJ = {
    "image_width": 100,
    "image_height": 100,
    "polygons": [
        {"points": [[0.0, 0.0], [1.0, 1.0]], "label": "burnt"}
    ],
}

SAMPLE_ANNOTATION = {
    "id": 1,
    "image_id": 10,
    "defect_labels": "burnt,spot",
    "mask_path": None,
    # IMPORTANT: AnnotationResponse.canvas_data is a string (JSON string), so use json.dumps
    "canvas_data": json.dumps(CANVAS_OBJ),
    "notes": "example",
    "annotation_type": AnnotationType.MANUAL,
    "created_by_user_id": mock_current_user.id,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
}

# ----------------- Tests (10 total) -----------------

# 1) Create manual: image not found -> 404
@patch(f"{ANNOTATION_SERVICE_PATCH_PATH}.create_manual_annotation")
async def test_create_manual_annotation_image_not_found(mock_create_manual, async_client):
    shared_mock_db.query.return_value.filter.return_value.first.return_value = None
    payload = {
        "image_id": 9999,
        "defect_labels": "x",
        "canvas_data": {"image_width": 10, "image_height": 10, "polygons": []},
    }
    response = await async_client.post("/api/v1/annotations/manual", json=payload)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert mock_create_manual.called is False

# 2) Create manual: forbidden when model owner differs -> 403
@patch(f"{ANNOTATION_SERVICE_PATCH_PATH}.create_manual_annotation")
async def test_create_manual_annotation_forbidden(mock_create_manual, async_client):
    image_mock = MagicMock(spec=Image)
    model_mock = MagicMock(spec=InspectionModel)
    model_mock.owner_id = 9999
    image_mock.inspection_model = model_mock
    shared_mock_db.query.return_value.filter.return_value.first.return_value = image_mock

    payload = {
        "image_id": 10,
        "defect_labels": "x",
        "canvas_data": {"image_width": 10, "image_height": 10, "polygons": []},
    }
    response = await async_client.post("/api/v1/annotations/manual", json=payload)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert mock_create_manual.called is False

# 3) Upload CSV — success
@patch(f"{ANNOTATION_SERVICE_PATCH_PATH}.upload_csv_annotations")
async def test_upload_csv_annotations_success(mock_upload_csv, async_client):
    model_mock = MagicMock(spec=InspectionModel)
    model_mock.id = 5
    model_mock.owner_id = mock_current_user.id
    shared_mock_db.query.return_value.filter.return_value.first.return_value = model_mock

    mock_upload_csv.return_value = [SAMPLE_ANNOTATION]
    csv_bytes = b"image_path,defect_labels,mask_path\nimg/001.jpg,burnt,masks/001.png\n"
    files = {"file": ("ann.csv", csv_bytes, "text/csv")}
    response = await async_client.post("/api/v1/annotations/upload-csv/5", files=files)
    assert response.status_code == status.HTTP_200_OK, response.text
    body = response.json()
    assert isinstance(body, list)
    assert body[0]["id"] == SAMPLE_ANNOTATION["id"]
    mock_upload_csv.assert_called_once_with(db=ANY, model_id=5, csv_content=ANY, user_id=mock_current_user.id)

# 4) Upload CSV — model not found -> 404
@patch(f"{ANNOTATION_SERVICE_PATCH_PATH}.upload_csv_annotations")
async def test_upload_csv_annotations_model_not_found(mock_upload_csv, async_client):
    shared_mock_db.query.return_value.filter.return_value.first.return_value = None
    csv_bytes = b"image_path,defect_labels,mask_path\n"
    files = {"file": ("ann.csv", csv_bytes, "text/csv")}
    response = await async_client.post("/api/v1/annotations/upload-csv/123", files=files)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert mock_upload_csv.called is False

# 5) Get by image — success
@patch(f"{ANNOTATION_SERVICE_PATCH_PATH}.get_by_image_id")
async def test_get_image_annotation_success(mock_get_by_image, async_client):
    image_mock = MagicMock(spec=Image)
    model_mock = MagicMock(spec=InspectionModel)
    model_mock.owner_id = mock_current_user.id
    image_mock.inspection_model = model_mock
    shared_mock_db.query.return_value.filter.return_value.first.return_value = image_mock

    mock_get_by_image.return_value = SAMPLE_ANNOTATION
    response = await async_client.get("/api/v1/annotations/image/10")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == SAMPLE_ANNOTATION["id"]
    assert isinstance(data["canvas_data"], str)
    mock_get_by_image.assert_called_once_with(db=ANY, image_id=10)

# 6) Get by image — annotation not found -> 404
@patch(f"{ANNOTATION_SERVICE_PATCH_PATH}.get_by_image_id")
async def test_get_image_annotation_not_found(mock_get_by_image, async_client):
    image_mock = MagicMock(spec=Image)
    model_mock = MagicMock(spec=InspectionModel)
    model_mock.owner_id = mock_current_user.id
    image_mock.inspection_model = model_mock
    shared_mock_db.query.return_value.filter.return_value.first.return_value = image_mock

    mock_get_by_image.return_value = None
    response = await async_client.get("/api/v1/annotations/image/999")
    assert response.status_code == status.HTTP_404_NOT_FOUND

# 7) Update annotation — success
@patch(f"{ANNOTATION_SERVICE_PATCH_PATH}.update")
async def test_update_annotation_success(mock_update, async_client):
    updated = dict(SAMPLE_ANNOTATION)
    updated["id"] = 1
    updated["defect_labels"] = "updated"
    mock_update.return_value = updated

    # AnnotationUpdate.canvas_data expects a STRING in your schema, so send JSON string
    payload = {
        "defect_labels": "updated",
        "mask_path": None,
        "canvas_data": json.dumps({"image_width": 10, "image_height": 10, "polygons": []}),
        "notes": "updated notes",
    }
    response = await async_client.put("/api/v1/annotations/1", json=payload)
    assert response.status_code == status.HTTP_200_OK, response.text
    assert response.json()["defect_labels"] == "updated"
    mock_update.assert_called_once_with(db=ANY, annotation_id=1, annotation_update=ANY)

# 8) Delete annotation — success
@patch(f"{ANNOTATION_SERVICE_PATCH_PATH}.delete")
async def test_delete_annotation_success(mock_delete, async_client):
    mock_delete.return_value = None
    response = await async_client.delete("/api/v1/annotations/1")
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), dict)
    mock_delete.assert_called_once_with(db=ANY, annotation_id=1)

# 9) List model annotations — success
async def test_list_model_annotations_success(async_client):
    model_mock = MagicMock(spec=InspectionModel)
    model_mock.owner_id = mock_current_user.id
    shared_mock_db.query.return_value.filter.return_value.first.return_value = model_mock

    sample_ann = dict(SAMPLE_ANNOTATION)
    sample_ann["image_id"] = 123
    shared_mock_db.query.return_value.join.return_value.filter.return_value.all.return_value = [sample_ann]

    response = await async_client.get("/api/v1/annotations/model/5")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert isinstance(body, list)
    assert body[0]["image_id"] == 123

# 10) List model annotations — model not found -> 404
async def test_list_model_annotations_model_not_found(async_client):
    shared_mock_db.query.return_value.filter.return_value.first.return_value = None
    response = await async_client.get("/api/v1/annotations/model/99")
    assert response.status_code == status.HTTP_404_NOT_FOUND