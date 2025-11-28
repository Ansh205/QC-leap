# 📌 Test Summary — Company API

## 🧪 1️⃣ `GET /api/v1/company/me`

### **Test Case:** `test_get_my_company_raises_response_validation_error`

| Item                | Details                                                               |
| ------------------- | --------------------------------------------------------------------- |
| **Method**          | GET                                                                   |
| **Endpoint**        | `/api/v1/company/me`                                                  |
| **Input**           | Authorized non-admin user (no body required)                          |
| **Expected Output** | ❌ Raise `ResponseValidationError` (schema mismatch in mocked DB data) |
| **Actual Output**   | ❌ `ResponseValidationError` raised as expected                        |

✔ **Status:** Passing

---

## 🧪 2️⃣ `PUT /api/v1/company/me`

### **Test Case:** `test_update_my_company_forbidden_for_non_admin`

| Item                | Details                                         |
| ------------------- | ----------------------------------------------- |
| **Method**          | PUT                                             |
| **Endpoint**        | `/api/v1/company/me`                            |
| **Input**           | JSON body with company fields + wrong user role |
| **Expected Status** | `403 Forbidden`                                 |
| **Actual Status**   | `403 Forbidden`                                 |

✔ **Status:** Passing

---

## 🧪 3️⃣ `GET /api/v1/company/members`

### **Test Case:** `test_get_company_members_forbidden_for_non_admin`

| Item                | Details                   |
| ------------------- | ------------------------- |
| **Method**          | GET                       |
| **Endpoint**        | `/api/v1/company/members` |
| **Input**           | Authorized non-admin user |
| **Expected Status** | `403 Forbidden`           |
| **Actual Status**   | `403 Forbidden`           |

✔ **Status:** Passing

---

## 🧪 4️⃣ `PUT /api/v1/company/members/{user_id}/permission`

### **Test Case:** `test_update_member_permission_forbidden_for_non_admin`

| Item                | Details                                                         |
| ------------------- | --------------------------------------------------------------- |
| **Method**          | PUT                                                             |
| **Endpoint**        | `/api/v1/company/members/1/permission`                          |
| **Input**           | `{ "permission": "INSPECT_ONLY", "current_password": "dummy" }` |
| **Expected Status** | `403 Forbidden`                                                 |
| **Actual Status**   | `403 Forbidden`                                                 |

✔ **Status:** Passing

---

## 🧪 5️⃣ `DELETE /api/v1/company/members/{user_id}`

### **Test Case:** `test_remove_member_from_company_forbidden_for_non_admin`

| Item                          | Details                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| **Method**                    | DELETE                                                                 |
| **Endpoint**                  | `/api/v1/company/members/1`                                            |
| **Input**                     | `{ "current_password": "dummy" }`                                      |
| **Expected Status**           | `403 Forbidden`                                                        |
| **Actual Output (initially)** | ❌ `422 Unprocessable Entity` *(Body missing / wrong method signature)* |
| **Actual Output (after fix)** | ✔ `403 Forbidden`                                                      |

📌 **Resolved Issue:**

* Validation triggered before permission check due to missing JSON body.
* Fixed by using:

  ```python
  client.request("DELETE", url, json=payload)
  ```

✔ **Status:** Now Passing

---

## ❗ APIs With Previous Expected vs. Actual Mismatch

| API                                 | Expected | Actual | Fix                                                   |
| ----------------------------------- | -------- | ------ | ----------------------------------------------------- |
| `DELETE /company/members/{user_id}` | 403      | 422    | Ensure JSON body is included using `client.request()` |

---

### 🎯 Final Result

| Total Tests | Passed | Failed |
| ----------- | ------ | ------ |
| 5           | 5      | 0      |
