from tests.conftest import seed_user


def test_missing_auth_header_returns_422(client):
    # FastAPI rejects missing required headers before reaching auth logic
    resp = client.get("/api/bookings/")
    assert resp.status_code == 422


def test_malformed_auth_header_returns_401(client):
    # Header present but not in "Bearer <token>" format
    resp = client.get("/api/bookings/", headers={"Authorization": "notbearer"})
    assert resp.status_code == 401


def test_invalid_jwt_returns_401(client):
    resp = client.get("/api/bookings/", headers={"Authorization": "Bearer bad.jwt.value"})
    assert resp.status_code == 401


def test_customer_on_owner_route_returns_403(client, db):
    _, token = seed_user(db, "customer")
    resp = client.get("/api/bookings/owner", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


def test_customer_can_access_auth_required_route(client, db):
    _, token = seed_user(db, "customer")
    resp = client.get("/api/bookings/", headers={"Authorization": f"Bearer {token}"})
    # 200 with empty list — not 401/403
    assert resp.status_code == 200
