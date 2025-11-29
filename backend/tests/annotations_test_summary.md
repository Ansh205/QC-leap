# Annotations API – Test Cases Summary

This document summarizes the results of running `test_annotations.py` for the backend API.

All tests executed using:

- `httpx.AsyncClient` with `ASGITransport(app=app)`
- Mocked DB session via overridden `get_db`
- Patched services (annotation, image, and model services where applicable)

Total Tests: **10**  
All Passed: **✔ 100%**

---

## 1. `test_create_manual_annotation_image_not_found`

**Endpoint:** `POST /api/v1/annotations/manual`  
**Description:** Creating a manual annotation should return `404` if the image does not exist.

| Item | Details |
|------|---------|
| **Precondition** | `image_service.get_image_by_id → None` |
| **Input** | `{ "image_id": 999, "label": "scratch" }` |
| **Expected Status** | `404 NOT FOUND` |
| **Actual Status** | `404` |
| **Assertions** | Correct error raised; annotation not created. |

---

## 2. `test_create_manual_annotation_forbidden`

**Description:** Users cannot annotate images belonging to another company.

| Item | Details |
|------|---------|
| **Precondition** | Image exists but belongs to a different company |
| **Expected Status** | `403 FORBIDDEN` |
| **Actual Status** | `403` |

---

## 3. `test_upload_csv_annotations_success`

**Endpoint:** `POST /api/v1/annotations/upload-csv/{model_id}`  
**Description:** Uploading a CSV with valid annotation rows succeeds.

| Item | Details |
|------|---------|
| **Precondition** | Valid model exists; CSV contains valid rows |
| **Expected Status** | `200 OK` |
| **Actual Status** | `200` |
| **Extra** | Service processes CSV and returns expected response. |

---

## 4. `test_upload_csv_annotations_model_not_found`

**Description:** CSV upload fails when model ID does not exist.

| Expected | `404 NOT FOUND` |
| Actual | `404` |

---

## 5. `test_get_image_annotation_success`

**Description:** Fetch annotation for a specific image.

| Expected | `200 OK` |
| Actual | `200` |
| Response | Proper annotation object returned/validated |

---

## 6. `test_get_image_annotation_not_found`

| Expected | `404` |
| Actual | `404` |

---

## 7. `test_update_annotation_success`

**Description:** Updating an existing annotation works.

| Expected | `200 OK` |
| Actual | `200` |

---

## 8. `test_delete_annotation_success`

**Description:** Deleting an annotation by ID works.

| Expected | `200 OK` |
| Actual | `200` |
| Notes | Ensures service delete method is called. |

---

## 9. `test_list_model_annotations_success`

**Description:** List all annotations for a model.

| Expected | `200 OK` |
| Actual | `200` |
| Response | Returns list of annotations |

---

## 10. `test_list_model_annotations_model_not_found`

| Expected | `404 NOT FOUND` |
| Actual | `404` |

---

## Final Summary

| Metric | Value |
|--------|--------|
| **Total Tests** | 10 |
| **Passed** | 10 |
| **Failures** | 0 |
| **Warnings** | 12 (Pydantic + SQLAlchemy deprecations, etc.) |
| **Runtime** | ~2.25 seconds |

All annotation-related API behaviors match the expected outcomes.

