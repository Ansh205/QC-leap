# 🖼️✨ Upload Mask Images API – Complete Test Report  
### _FastAPI • Unit Testing • Pytest • Mocking • File Uploads_

---

## 🚀 Overview

This document summarizes the **unit testing** performed on the following API endpoint:

```
POST /api/v1/images/{model_id}/upload-masks
```

The endpoint allows an authenticated user to upload **PNG mask images** for a specific inspection model.

🔐 **Security Rule:** Only the **model owner** is allowed to upload mask files.

📂 **Upload Behavior:**  
- Only `.png` files are accepted  
- Invalid images are rejected  
- All uploads stored under `/uploads/<user>/<model_id>/masks/`

All tests were fully isolated using **mocked dependencies**, **mocked filesystem**, and **mocked DB**.

---

# 🧪 Test Execution Summary

```
8 passed, 0 failed, 11 warnings — in 5.87s
```

| Status | Count | Description |
|--------|-------|-------------|
| ✅ Pass | 8 | All test cases passed successfully |
| ❌ Fail | 0 | No test failure |
| ⚠️ Warnings | 11 | Normal Pydantic/SQLAlchemy deprecation |

✔ **Test suite is fully stable.**

---

# 📦 Testing Tools & Environment

| Component | Version |
|----------|---------|
| Python | 3.11 |
| FastAPI | Latest |
| Pytest | 9.x |
| httpx | AsyncClient |
| unittest.mock | MagicMock, patch |
| OS | Windows 10 / WSL Enabled |

### 🛠️ Mocked Components
- `get_db` → **shared MagicMock DB**
- `get_current_active_user` → **mock user**
- `InspectionModel` lookup → **patched DB chain**
- File I/O:
  - `open()`
  - `os.makedirs()`
  - `os.remove()`
- Image validation → `validate_image_file()` patched

Everything ensures **zero real database usage** and **no actual filesystem writes**.

---

# 🧩 Test Cases Breakdown

Each test is documented below with:

- 🔍 What it tests  
- ⚙️ Mocks used  
- 📝 Expected result  
- 🎉 Final status  

---

## 1️⃣ test_upload_masks_success — *Valid PNG Upload*

**📝 Description:**  
Model owner uploads a **valid PNG**.

**⚙️ Mocks:**  
- DB returns model with `owner_id = 1`  
- `validate_image_file → True`  
- Filesystem fully mocked  

**🎯 Expected:**  
- `200 OK`  
- 1 uploaded file  

**🎉 Result: PASS**

---

## 2️⃣ test_upload_masks_invalid_extension — *Reject Non-PNG*

**📝 Description:**  
Attempts to upload `.txt` file.  

**🎯 Expected:**  
- `200 OK`  
- 0 uploaded masks  

**🎉 Result: PASS**

---

## 3️⃣ test_upload_masks_model_not_found — *Invalid Model ID*

**📝 Description:**  
DB returns `None` → Model does not exist.

**🎯 Expected:**  
- `404 Not Found`  
- `{ "detail": "Inspection model not found" }`

**🎉 Result: PASS**

---

## 4️⃣ test_upload_masks_forbidden — *User Not Owner*

**📝 Description:**  
Authenticated user is **not** model owner.

**🎯 Expected:**  
- `403 Forbidden`

**🎉 Result: PASS**

---

## 5️⃣ test_upload_masks_invalid_png — *PNG Fails Validation*

**⚠️ Challenge Solved:**  
`validate_image_file=False` previously caused a `FileNotFoundError`.  
Mocking `os.remove()` fixed this.

**🎯 Expected:**  
- `200 OK`  
- The file is rejected  
- Upload count = 0  

**🎉 Result: PASS**

---

## 6️⃣ test_upload_masks_mixed — *1 Good + 1 Invalid PNG*

**📝 Description:**  
Good file uploaded, bad PNG removed.

**🎯 Expected:**  
- `200 OK`  
- 1 uploaded  

**🎉 Result: PASS**

---

## 7️⃣ test_upload_masks_no_files — *Empty Upload*

**🎯 Expected:**  
- `200 OK`  
- No masks uploaded  

**🎉 Result: PASS**

---

## 8️⃣ test_upload_masks_filename_sanitization — *Strip nested paths*

**📝 Description:**  
Upload file with name:  
```
folder/inner/mask.png
```

**🎯 Expected:**  
Final saved name: `mask.png`

**🎉 Result: PASS**

---

# 🔧 Key Engineering Fixes That Made Tests Work

| Issue | Solution |
|-------|----------|
| DB patch not applied | Corrected full patch chain: `shared_db.query.return_value.filter.return_value.first.return_value` |
| Real file deletion causing error | Added `@patch("os.remove")` |
| Writing file to non-existent folder | Patched `open()` + `os.makedirs()` |
| PNG validation dependency interfering | Patched `validate_image_file` |
| Permission 403 even for correct owner | Fixed by patching DB instead of patching `InspectionModel` class |

---

# 📚 Summary

🎉 **All 8 test cases passed successfully!**  

