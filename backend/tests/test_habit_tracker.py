# Regression tests for community habit tracker: auth, habits, ticks/stats, community, comments
import os
import uuid
from datetime import date, timedelta
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


def _register(name):
    email = f"TEST_{name}_{uuid.uuid4().hex[:8]}@example.com".lower()
    r = requests.post(f"{API}/auth/register", json={"display_name": name, "email": email, "password": "pass123"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "token": d["token"], "user": d["user"], "h": {"Authorization": f"Bearer {d['token']}"}}


@pytest.fixture(scope="module")
def alice():
    return _register("Alice")


@pytest.fixture(scope="module")
def bob():
    return _register("Bob")


# Auth
class TestAuth:
    def test_register_sets_cookie_and_returns_user(self):
        email = f"test_c_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"display_name": "Carl", "email": email, "password": "pass123"})
        assert r.status_code == 200
        assert r.json()["user"]["display_name"] == "Carl"
        sc = r.headers.get("set-cookie", "")
        assert "access_token=" in sc and "HttpOnly" in sc

    def test_duplicate_register(self, alice):
        r = requests.post(f"{API}/auth/register", json={"display_name": "X", "email": alice["email"], "password": "pass123"})
        assert r.status_code == 400

    def test_login_ok_and_me(self, alice):
        r = requests.post(f"{API}/auth/login", json={"email": alice["email"], "password": "pass123"})
        assert r.status_code == 200
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {r.json()['token']}"})
        assert me.status_code == 200 and me.json()["email"] == alice["email"]
        assert "password_hash" not in me.json()

    def test_login_wrong_password(self, alice):
        r = requests.post(f"{API}/auth/login", json={"email": alice["email"], "password": "wrong!!"})
        assert r.status_code == 401

    def test_unauth(self):
        assert requests.get(f"{API}/habits/mine").status_code == 401


# Habits, ticks, stats
class TestHabits:
    def test_flow(self, alice, bob):
        r = requests.post(f"{API}/habits", json={"name": "TEST_Run", "when_i_do_it": "Morning"}, headers=alice["h"])
        assert r.status_code == 200
        h = r.json()
        assert h["shared"] is False and h["days_done"] == 0 and h["current_streak"] == 0
        hid = h["id"]
        mine = requests.get(f"{API}/habits/mine", headers=alice["h"]).json()
        assert any(x["id"] == hid for x in mine)
        assert not any(x["id"] == hid for x in requests.get(f"{API}/habits/mine", headers=bob["h"]).json())
        # private: not in community, 404 for bob
        assert not any(x["id"] == hid for x in requests.get(f"{API}/habits/community", headers=bob["h"]).json())
        assert requests.get(f"{API}/habits/{hid}", headers=bob["h"]).status_code == 404
        assert requests.put(f"{API}/habits/{hid}/ticks", json={"date": "2026-01-01", "done": True}, headers=bob["h"]).status_code == 404
        # ticks & streak
        t = date.today()
        for off in [0, 1, 3, 4, 5]:
            d = (t - timedelta(days=off)).isoformat()
            assert requests.put(f"{API}/habits/{hid}/ticks", json={"date": d, "done": True}, headers=alice["h"]).status_code == 200
        g = requests.get(f"{API}/habits/{hid}", headers=alice["h"]).json()
        assert g["days_done"] == 5 and g["current_streak"] == 2
        # idempotent tick
        requests.put(f"{API}/habits/{hid}/ticks", json={"date": t.isoformat(), "done": True}, headers=alice["h"])
        # untick today -> most recent is yesterday, streak 1
        r = requests.put(f"{API}/habits/{hid}/ticks", json={"date": t.isoformat(), "done": False}, headers=alice["h"])
        assert r.json()["days_done"] == 4 and r.json()["current_streak"] == 1
        # untick yesterday -> most recent day 3 back, 3,4,5 -> streak 3
        r = requests.put(f"{API}/habits/{hid}/ticks", json={"date": (t - timedelta(days=1)).isoformat(), "done": False}, headers=alice["h"])
        assert r.json()["days_done"] == 3 and r.json()["current_streak"] == 3
        # bad date
        assert requests.put(f"{API}/habits/{hid}/ticks", json={"date": "2026-13-40", "done": True}, headers=alice["h"]).status_code == 400
        assert requests.put(f"{API}/habits/{hid}/ticks", json={"date": "abc", "done": True}, headers=alice["h"]).status_code == 400

    def test_empty_name(self, alice):
        assert requests.post(f"{API}/habits", json={"name": "   "}, headers=alice["h"]).status_code in (400, 422)
        assert requests.post(f"{API}/habits", json={"name": ""}, headers=alice["h"]).status_code == 422


# Community & comments
class TestCommunity:
    def test_shared_flow(self, alice, bob):
        h = requests.post(f"{API}/habits", json={"name": "TEST_Read", "when_i_do_it": "Night", "shared": True}, headers=alice["h"]).json()
        hid = h["id"]
        requests.put(f"{API}/habits/{hid}/ticks", json={"date": date.today().isoformat(), "done": True}, headers=alice["h"])
        com = requests.get(f"{API}/habits/community", headers=bob["h"]).json()
        item = next(x for x in com if x["id"] == hid)
        assert item["owner_name"] == "Alice" and item["when_i_do_it"] == "Night" and item["days_done"] == 1
        assert all(x["shared"] for x in com)
        g = requests.get(f"{API}/habits/{hid}", headers=bob["h"])
        assert g.status_code == 200 and g.json()["is_owner"] is False
        r = requests.put(f"{API}/habits/{hid}/ticks", json={"date": date.today().isoformat(), "done": False}, headers=bob["h"])
        assert r.status_code == 403
        c = requests.post(f"{API}/habits/{hid}/comments", json={"text": "TEST_Nice"}, headers=bob["h"])
        assert c.status_code == 200 and c.json()["author_name"] == "Bob"
        assert requests.post(f"{API}/habits/{hid}/comments", json={"text": "  "}, headers=bob["h"]).status_code == 400
        own = requests.get(f"{API}/habits/{hid}", headers=alice["h"]).json()
        assert any(x["text"] == "TEST_Nice" and x["author_name"] == "Bob" for x in own["comments"])
        assert own["days_done"] == 1
