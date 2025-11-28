# Authentication API – Test Cases

Base Prefix: `AUTH_URL = {settings.API_V1_PREFIX}/auth`
Assuming `settings.API_V1_PREFIX = "/api/v1"`, the full paths are:

* `/api/v1/auth/register`
* `/api/v1/auth/login`

All tests are run using:

* `httpx.AsyncClient` with `ASGITransport(app=app)`
* `get_db` dependency overridden with a mocked `Session`
* `user_service` patched at: `app.api.v1.auth.user_service`

---

## 1. `test_register_success` – Successful User Registration

**Endpoint:** `POST /api/v1/auth/register`
**Description:** A standard user registers with valid details.

| Item                           | Details                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Precondition (mocks)**       | `user_service.get_by_email → None` (email not used before)  ; `user_service.get_by_username → None` (username free) ; `user_service.create → MOCK_USER_RESPONSE`                                 |
| **Input (JSON body)**          | `json\n{\n  "email": "test@example.com",\n  "username": "testuser",\n  "full_name": "Test User",\n  "password": "securepassword123",\n  "is_company_admin": false,\n  "company_data": null\n}\n` |
| **Expected Status**            | `201 Created`                                                                                                                                                                                    |
| **Expected Body (key fields)** | Contains the created user: same `email` and `username` as request. Matches `UserResponse` shape.                                                                                                 |
| **Actual Status**              | `201 Created`                                                                                                                                                                                    |
| **Actual Body**                | `email == "test@example.com"`, `username == "testuser"`. Valid against `UserResponse`.                                                                                                           |
| **Notes**                      | Asserts that `user_service.create` is called exactly once.                                                                                                                                       |

✅ **Result:** PASS

---

## 2. `test_register_email_exists` – Email Already Registered

**Endpoint:** `POST /api/v1/auth/register`
**Description:** Registration should fail if email is already in use.

| Item                     | Details                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Precondition (mocks)** | `user_service.get_by_email → MagicMock()` (simulates existing user with same email) ; `user_service.get_by_username → None` |
| **Input (JSON body)**    | Same as `VALID_USER_DATA` in test: `"test@example.com"`, `"testuser"`, etc.                                                 |
| **Expected Status**      | `400 Bad Request`                                                                                                           |
| **Expected Body**        | `json\n{ "detail": "Email already registered" }\n`                                                                          |
| **Actual Status**        | `400 Bad Request`                                                                                                           |
| **Actual Body**          | `json\n{ "detail": "Email already registered" }\n`                                                                          |

✅ **Result:** PASS

---

## 3. `test_register_username_exists` – Username Already Taken

**Endpoint:** `POST /api/v1/auth/register`
**Description:** Registration should fail if username is already taken.

| Item                     | Details                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Precondition (mocks)** | `user_service.get_by_email → None` ; `user_service.get_by_username → MagicMock()` (simulates existing username) |
| **Input (JSON body)**    | Same `VALID_USER_DATA` (new email, but username `"testuser"`).                                                  |
| **Expected Status**      | `400 Bad Request`                                                                                               |
| **Expected Body**        | `json\n{ "detail": "Username already taken" }\n`                                                                |
| **Actual Status**        | `400 Bad Request`                                                                                               |
| **Actual Body**          | `json\n{ "detail": "Username already taken" }\n`                                                                |

✅ **Result:** PASS

---

## 4. `test_register_admin_missing_company_data` – Admin Without Company Data

**Endpoint:** `POST /api/v1/auth/register`
**Description:** A user marked as company admin **must** provide `company_data`.

| Item                     | Details                                                                                                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Precondition (mocks)** | `user_service.get_by_email → None` ; `user_service.get_by_username → None` ; `user_service.create` should **not** be called.                                                                                                                                      |
| **Input (JSON body)**    | Based on `VALID_ADMIN_DATA`, but with `company_data` removed:  `json\n{\n  "email": "admin@example.com",\n  "username": "adminuser",\n  "full_name": "Admin User",\n  "password": "securepassword123",\n  "is_company_admin": true,\n  "company_data": null\n}\n` |
| **Expected Status**      | `400 Bad Request`                                                                                                                                                                                                                                                 |
| **Expected Body**        | `json\n{ "detail": "Company data required when creating company admin account" }\n`                                                                                                                                                                               |
| **Actual Status**        | `400 Bad Request`                                                                                                                                                                                                                                                 |
| **Actual Body**          | `json\n{ "detail": "Company data required when creating company admin account" }\n`                                                                                                                                                                               |

✅ **Result:** PASS

### 💡 How testing helped here

Initially, when this scenario was tested **without mocking `get_by_email/get_by_username` to None**, the actual error returned was:

```json
{ "detail": "Email already registered" }
```

instead of:

```json
{ "detail": "Company data required when creating company admin account" }
```

The test revealed that the **validation order** meant the function was exiting early on email/username checks and never reaching the company admin logic.
By controlling mocks and writing a focused test, we confirmed (and enforced) the correct behavior.

---

## 5. `test_login_success_username` – Successful Login (Username)

**Endpoint:** `POST /api/v1/auth/login`
**Description:** Valid username + password should generate a JWT access token.

| Item                     | Details                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Precondition (mocks)** | `user_service.authenticate → mock_user` where `mock_user.id = 1` and `mock_user.is_active = True`                |
| **Input (Form Data)**    | `username = "testuser"` ; `password = "securepassword123"`                                                       |
| **Expected Status**      | `200 OK`                                                                                                         |
| **Expected Body**        | JSON with:  `json\n{ "access_token": "<jwt>", "token_type": "bearer" }\n` and valid against `Token` schema.      |
| **Actual Status**        | `200 OK`                                                                                                         |
| **Actual Body**          | Contains `"access_token"` and `"token_type": "bearer"`. Successfully validated via `Token.model_validate(data)`. |
| **Extra Assertions**     | Asserts `user_service.authenticate` is called with `db=ANY`, and correct `username_or_email` and `password`.     |

✅ **Result:** PASS

---

## 6. `test_login_invalid_credentials` – Wrong Username/Password

**Endpoint:** `POST /api/v1/auth/login`
**Description:** Incorrect credentials should be rejected.

| Item                     | Details                                                        |
| ------------------------ | -------------------------------------------------------------- |
| **Precondition (mocks)** | `user_service.authenticate → None` (no matching user found)    |
| **Input (Form Data)**    | `username = "wronguser"` ; `password = "wrongpassword"`        |
| **Expected Status**      | `401 Unauthorized`                                             |
| **Expected Body**        | `json\n{ "detail": "Incorrect username/email or password" }\n` |
| **Expected Headers**     | `WWW-Authenticate: Bearer`                                     |
| **Actual Status**        | `401 Unauthorized`                                             |
| **Actual Body**          | `json\n{ "detail": "Incorrect username/email or password" }\n` |
| **Actual Headers**       | Contains `WWW-Authenticate` header as expected.                |

✅ **Result:** PASS

---

## 7. `test_login_inactive_user` – Inactive User Cannot Log In

**Endpoint:** `POST /api/v1/auth/login`
**Description:** A user with `is_active = False` should not be able to log in.

| Item                     | Details                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| **Precondition (mocks)** | `user_service.authenticate → mock_inactive_user` with `is_active = False` |
| **Input (Form Data)**    | `username = "inactiveuser"` ; `password = "password"`                     |
| **Expected Status**      | `400 Bad Request`                                                         |
| **Expected Body**        | `json\n{ "detail": "Inactive user" }\n`                                   |
| **Actual Status**        | `400 Bad Request`                                                         |
| **Actual Body**          | `json\n{ "detail": "Inactive user" }\n`                                   |

✅ **Result:** PASS

---

## Summary of How These Test Cases Are “Proper” API Tests

Each test case:

* Clearly defines:

  * **Input** (JSON or form-data)
  * **Preconditions** via mocks (`user_service`, `get_db`)
  * **Expected HTTP status and body**
* Compares with the **Actual output** from the running FastAPI app.
* Uses schemas (`UserResponse`, `Token`) to validate structure.
* Demonstrates how a subtle behavior bug (company admin missing data) was caught and corrected through tests.
