import requests
import pytest

# Tests for the model creation and synthetic image generation API
# Endpoint base: http://localhost:8000/api/v1/models/

# NOTE: This suite expects a local API running on http://localhost:8000
# If the server is not reachable the tests will be skipped.

BASE_URL = "http://localhost:8000/api/v1/models"

# Token copied from the provided attachment; update if you have a different test token
TEST_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjQ0MjkzNzMsInN1YiI6IjEifQ.ASN-MxWaQJ_oF5uOGgCCiO84-cUhw5WCmInAgmP3HDE"
)

HEADERS = {
    "Authorization": f"Bearer {TEST_TOKEN}",
    "accept": "application/json",
    "Content-Type": "application/json",
}

# Container to record test outcomes for summarizing at the end.
_TEST_RESULTS = {}


def _ensure_api_available(timeout: float = 2.0):
    """Try to connect to the API base host; skip tests if it's not running."""
    try:
        # Hitting the root of the server; we only need to know whether it's reachable
        requests.get("http://localhost:8000", timeout=timeout)
    except requests.RequestException:
        pytest.skip("Local API not running on http://localhost:8000 - skipping integration tests")


def test_create_model():
    # Purpose: Positive/happy-path test that posts a valid model payload and
    # expects the API to create the model (status 200/201/202) and return JSON
    # including either the created object or an identifier.
    _ensure_api_available()

    payload = {
        "name": "sample_model_1",
        "description": "sample_model_1",
        "num_synthetic_images": 100,
        "enable_human_validation": True,
        "is_public": False,
    }

    resp = requests.post(f"{BASE_URL}/", headers=HEADERS, json=payload, timeout=15)
    assert resp.status_code in (200, 201, 202), f"Unexpected status: {resp.status_code} - {resp.text}"

    try:
        data = resp.json()
    except ValueError:
        pytest.fail("Response is not JSON: %s" % resp.text)

    # Prefer explicit id check; some APIs return created object, some return location only
    assert ("id" in data) or (data.get("name") == payload["name"]) or resp.status_code in (201, 202)


def test_generate_synthetic_after_create():
    # Purpose: Integration test that creates a model and then triggers
    # `generate-synthetic` for that model. Verifies the endpoint accepts
    # the request and returns a success-like status (200/201/202).
    _ensure_api_available()

    payload = {
        "name": "sample_model_for_synth",
        "description": "test model for synthetic generation",
        "num_synthetic_images": 100,
        "enable_human_validation": True,
        "is_public": False,
    }

    create_resp = requests.post(f"{BASE_URL}/", headers=HEADERS, json=payload, timeout=15)
    assert create_resp.status_code in (200, 201, 202), f"Create failed: {create_resp.status_code} {create_resp.text}"

    try:
        create_data = create_resp.json()
    except ValueError:
        create_data = {}

    model_id = create_data.get("id")

    if not model_id:
        # Fallback: list models and find by name
        list_resp = requests.get(f"{BASE_URL}/", headers=HEADERS, timeout=10)
        assert list_resp.status_code == 200, f"List failed: {list_resp.status_code} {list_resp.text}"
        try:
            items = list_resp.json()
        except ValueError:
            pytest.fail("List response not JSON: %s" % list_resp.text)

        # Support paginated responses with 'results'
        if isinstance(items, dict) and "results" in items:
            items_list = items["results"]
        else:
            items_list = items

        matches = [it for it in items_list if it.get("name") == payload["name"]]
        assert matches, "Could not find created model in list"
        model_id = matches[0].get("id")

    assert model_id, "Unable to determine model id to call generate-synthetic"

    gen_resp = requests.post(f"{BASE_URL}/{model_id}/generate-synthetic", headers=HEADERS, timeout=30)
    assert gen_resp.status_code in (200, 201, 202), f"Generate failed: {gen_resp.status_code} {gen_resp.text}"

    # response may include a task id or status
    try:
        gen_data = gen_resp.json()
    except ValueError:
        gen_data = {}

    assert gen_data or gen_resp.text, "Empty response from generate-synthetic"


@pytest.mark.parametrize("value,expected", [(100, True), (150, True)])
def test_create_model_parametric(value, expected):
    # Purpose: Parameterized positive tests for boundary/valid values of
    # `num_synthetic_images` (e.g., 100 and 150) to ensure validation accepts
    # values at and above the minimum.
    """Parametric positive cases for valid `num_synthetic_images` values."""
    _ensure_api_available()

    payload = {
        "name": f"param_model_{value}",
        "description": "parametric test",
        "num_synthetic_images": value,
        "enable_human_validation": False,
        "is_public": False,
    }

    resp = requests.post(f"{BASE_URL}/", headers=HEADERS, json=payload, timeout=15)
    assert resp.status_code in (200, 201, 202), f"Unexpected status: {resp.status_code} - {resp.text}"


def test_create_model_validation_fail_below_minimum():
    # Purpose: Negative test ensuring the API rejects `num_synthetic_images`
    # values below the minimum (e.g., 99) with a 422 validation error and
    # that the validation details mention the offending field.
    """Negative: API should reject num_synthetic_images < 100 with 422."""
    _ensure_api_available()

    payload = {
        "name": "bad_model",
        "description": "should fail",
        "num_synthetic_images": 99,
        "enable_human_validation": False,
        "is_public": False,
    }

    resp = requests.post(f"{BASE_URL}/", headers=HEADERS, json=payload, timeout=15)
    assert resp.status_code == 422, f"Expected 422 validation error, got {resp.status_code} - {resp.text}"
    try:
        body = resp.json()
    except ValueError:
        pytest.fail("Expected JSON validation details but response was not JSON")

    # Expect validation for num_synthetic_images
    assert any(
        (isinstance(it, dict) and it.get("loc") and "num_synthetic_images" in str(it.get("loc")))
        for it in body.get("detail", [])
    ), f"Validation detail did not mention num_synthetic_images: {body}"


def test_create_model_missing_required_field():
    # Purpose: Negative test that omits a required field (`name`) and expects
    # a 422 validation error from the API.
    """Negative: missing `name` should cause validation error (422)."""
    _ensure_api_available()

    payload = {
        # "name" omitted intentionally
        "description": "missing name",
        "num_synthetic_images": 100,
        "enable_human_validation": False,
        "is_public": False,
    }

    resp = requests.post(f"{BASE_URL}/", headers=HEADERS, json=payload, timeout=15)
    assert resp.status_code == 422, f"Expected 422 for missing name, got {resp.status_code} - {resp.text}"


def test_create_requires_authentication():
    # Purpose: Negative test to verify the API enforces authentication and
    # returns 401 or 403 when Authorization header is missing.
    """Negative: creating a model without Authorization should return 401/403."""
    _ensure_api_available()

    payload = {
        "name": "unauth_model",
        "description": "no auth",
        "num_synthetic_images": 100,
        "enable_human_validation": False,
        "is_public": False,
    }

    # Drop Authorization header
    headers = {k: v for k, v in HEADERS.items() if k != "Authorization"}
    resp = requests.post(f"{BASE_URL}/", headers=headers, json=payload, timeout=15)
    assert resp.status_code in (401, 403), f"Expected 401/403 for unauthenticated request, got {resp.status_code} - {resp.text}"


def test_generate_synthetic_invalid_id():
    # Purpose: Negative test that calls `generate-synthetic` with a non-existent
    # model id and expects a 404 (or possibly 400 depending on API behavior).
    """Negative: calling generate-synthetic on a non-existent id should return 404."""
    _ensure_api_available()

    fake_id = "999999999"
    resp = requests.post(f"{BASE_URL}/{fake_id}/generate-synthetic", headers=HEADERS, timeout=10)
    assert resp.status_code in (404, 400), f"Expected 404/400 for invalid id, got {resp.status_code} - {resp.text}"


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Pytest hook that captures each test's result after the call phase.

    We store the nodeid => status mapping in `_TEST_RESULTS` so we can
    print a concise summary at the end of the test session.
    """
    outcome = yield
    rep = outcome.get_result()
    # Only record the outcome of the test 'call' phase (not setup/teardown)
    if rep.when == "call":
        # rep.outcome is one of 'passed', 'failed', 'skipped'
        _TEST_RESULTS[rep.nodeid] = rep.outcome.upper()


def pytest_sessionfinish(session, exitstatus):
    """Pytest hook that prints the summary of test results at session end.

    Format for each line: `test_name : STATUS` where `test_name` is pytest's
    nodeid (file::testname[params]) and STATUS is PASSED/FAILED/SKIPPED.
    """
    # Ensure we always print a header for clarity
    print("\n" + "="*70)
    print("TEST SUMMARY REPORT")
    print("="*70)
    for nodeid, status in _TEST_RESULTS.items():
        test_name = nodeid.split("::")[-1]
        print(f"{test_name} : {status}")
    print("="*70)

