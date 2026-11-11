"""
Comprehensive Automated Test Suite for Glossy Auth API.
Tests all endpoints, security constraints, validation, Google OAuth, and session states.
"""
import unittest
import json
import os

from app import app
import database

class GlossyAuthApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database.init_db()

    def setUp(self):
        self.client = app.test_client()

    def test_01_index_html_served(self):
        """Verify the glossy frontend is served at /"""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"AURA // Glossy Interactive Auth API", response.data)
        self.assertIn(b"card-gloss-highlight", response.data)
        self.assertIn(b"spotlight-btn", response.data)

    def test_02_health_endpoint(self):
        """Verify health check returns status and database metrics."""
        response = self.client.get("/api/auth/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["status"], "healthy")
        self.assertIn("stats", data)
        self.assertGreaterEqual(data["stats"]["total_users"], 1)

    def test_03_demo_credentials(self):
        """Verify demo account info endpoint."""
        response = self.client.get("/api/auth/demo-credentials")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["demo"]["identifier"], "demo@glossyapi.dev")

    def test_04_demo_login_success(self):
        """Verify login with the pre-seeded demo user."""
        payload = {
            "identifier": "demo@glossyapi.dev",
            "password": "GlossyPass123!",
            "remember": True
        }
        response = self.client.post("/api/auth/login",
                                    data=json.dumps(payload),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        self.assertTrue(data["token"].startswith("glossy_"))
        self.assertEqual(data["user"]["email"], "demo@glossyapi.dev")

    def test_05_login_invalid_password(self):
        """Verify login rejection with incorrect password."""
        payload = {
            "identifier": "demo@glossyapi.dev",
            "password": "WrongPassword123!"
        }
        response = self.client.post("/api/auth/login",
                                    data=json.dumps(payload),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 401)
        data = response.get_json()
        self.assertFalse(data["success"])
        self.assertIn("Invalid credentials", data["error"])

    def test_06_login_nonexistent_user(self):
        """Verify login rejection for non-existent user."""
        payload = {
            "identifier": "ghost_user_99999@nobody.org",
            "password": "AnyPassword123!"
        }
        response = self.client.post("/api/auth/login",
                                    data=json.dumps(payload),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 401)
        data = response.get_json()
        self.assertFalse(data["success"])

    def test_07_register_user_success(self):
        """Verify registration of a new user."""
        import time
        ts = int(time.time() * 1000)
        self.__class__.test_user = f"user_{ts}"
        self.__class__.test_email = f"user_{ts}@zion.org"
        payload = {
            "username": self.__class__.test_user,
            "email": self.__class__.test_email,
            "password": "CyberPassword2026!",
            "full_name": "Test User"
        }
        response = self.client.post("/api/auth/register",
                                    data=json.dumps(payload),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        self.assertEqual(data["user"]["username"], self.__class__.test_user)
        self.assertEqual(data["user"]["email"], self.__class__.test_email)

    def test_08_register_duplicate_username_or_email(self):
        """Verify registration fails for existing username or email."""
        payload = {
            "username": getattr(self.__class__, "test_user", "trinity_matrix"),
            "email": "another_email@zion.org",
            "password": "CyberPassword2026!"
        }
        response = self.client.post("/api/auth/register",
                                    data=json.dumps(payload),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 409)
        data = response.get_json()
        self.assertFalse(data["success"])
        self.assertIn("Username is already taken", data["error"])

    def test_09_register_validation_errors(self):
        """Verify registration validation rules for short password and invalid email."""
        res1 = self.client.post("/api/auth/register",
                                data=json.dumps({"username": "gooduser", "email": "valid@email.com", "password": "123"}),
                                content_type="application/json")
        self.assertEqual(res1.status_code, 400)
        self.assertIn("at least 6 characters", res1.get_json()["error"])

        res2 = self.client.post("/api/auth/register",
                                data=json.dumps({"username": "gooduser2", "email": "not-an-email", "password": "validPassword123!"}),
                                content_type="application/json")
        self.assertEqual(res2.status_code, 400)
        self.assertIn("valid email", res2.get_json()["error"])

    def test_10_authenticated_profile_endpoint(self):
        """Verify GET /api/auth/me returns user profile when authenticated."""
        login_res = self.client.post("/api/auth/login",
                                     data=json.dumps({"identifier": "demo@glossyapi.dev", "password": "GlossyPass123!"}),
                                     content_type="application/json")
        token = login_res.get_json()["token"]

        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        user_info = me_res.get_json()["user"]
        self.assertEqual(user_info["email"], "demo@glossyapi.dev")
        self.assertNotIn("password_hash", user_info)

    def test_11_unauthenticated_profile_rejected(self):
        """Verify GET /api/auth/me rejects requests missing tokens."""
        me_res = self.client.get("/api/auth/me")
        self.assertEqual(me_res.status_code, 401)
        data = me_res.get_json()
        self.assertFalse(data["success"])
        self.assertIn("missing", data["error"])

    def test_12_logout_and_session_invalidation(self):
        """Verify POST /api/auth/logout invalidates session token."""
        login_res = self.client.post("/api/auth/login",
                                     data=json.dumps({"identifier": "demo@glossyapi.dev", "password": "GlossyPass123!"}),
                                     content_type="application/json")
        token = login_res.get_json()["token"]

        res_before = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_before.status_code, 200)

        logout_res = self.client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(logout_res.status_code, 200)

        res_after = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_after.status_code, 401)

    def test_13_google_oauth_signup_new_user(self):
        """Verify Google Sign-Up creates a new user and returns a valid session token."""
        import time
        unique_email = f"dev.google.{int(time.time()*1000)}@gmail.com"
        self.__class__.google_test_email = unique_email
        payload = {
            "email": unique_email,
            "name": "Dev Tester",
            "google_id": f"gid_{int(time.time()*1000)}",
            "picture": "https://lh3.googleusercontent.com/avatar1"
        }
        res = self.client.post("/api/auth/oauth/google",
                               data=json.dumps(payload),
                               content_type="application/json")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertTrue(data["is_new_user"])
        self.assertIn("token", data)
        self.assertEqual(data["user"]["email"], unique_email)
        self.assertEqual(data["user"]["auth_provider"], "google")

        # Verify token allows profile access
        token = data["token"]
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.get_json()["user"]["full_name"], "Dev Tester")

    def test_14_google_oauth_signin_existing_user(self):
        """Verify Google Sign-In with already registered email authenticates and links existing account."""
        email = getattr(self.__class__, "google_test_email", "dev.tester.google@gmail.com")
        payload = {
            "email": email,
            "name": "Dev Tester"
        }
        res = self.client.post("/api/auth/oauth/google",
                               data=json.dumps(payload),
                               content_type="application/json")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertFalse(data["is_new_user"])  # Existing account authenticated!

    def test_15_google_oauth_config(self):
        """Verify Google OAuth configuration endpoint."""
        res = self.client.get("/api/auth/oauth/google/config")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertTrue(data["interactive_simulator_ready"])

    def test_16_update_user_profile(self):
        """Verify updating authenticated user's profile information."""
        # 1. Login
        login_res = self.client.post("/api/auth/login",
                                     data=json.dumps({"identifier": "demo@glossyapi.dev", "password": "GlossyPass123!"}),
                                     content_type="application/json")
        token = login_res.get_json()["token"]

        # 2. Update profile via PUT /api/auth/profile
        update_payload = {
            "username": "AlexGlossy",
            "full_name": "Alexander Mercer Senior"
        }
        res = self.client.put("/api/auth/profile",
                              headers={"Authorization": f"Bearer {token}"},
                              data=json.dumps(update_payload),
                              content_type="application/json")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["user"]["full_name"], "Alexander Mercer Senior")

        # 3. Verify via GET /api/auth/me
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.get_json()["user"]["full_name"], "Alexander Mercer Senior")

    def test_17_get_audit_logs(self):
        """Verify retrieval of security audit logs for authenticated user."""
        login_res = self.client.post("/api/auth/login",
                                     data=json.dumps({"identifier": "demo@glossyapi.dev", "password": "GlossyPass123!"}),
                                     content_type="application/json")
        token = login_res.get_json()["token"]

        res = self.client.get("/api/auth/audit-logs", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("audit_logs", data)
        self.assertIsInstance(data["audit_logs"], list)
        self.assertGreaterEqual(len(data["audit_logs"]), 1)

    def test_18_null_and_whitespace_safety(self):
        """Verify that null/empty/whitespace fields do not crash with 500 AttributeError."""
        # 1. Null username in register
        res1 = self.client.post("/api/auth/register",
                                data=json.dumps({"username": None, "email": "nulltest@zion.org", "password": "SafePassword123!"}),
                                content_type="application/json")
        self.assertEqual(res1.status_code, 400)
        self.assertFalse(res1.get_json()["success"])

        # 2. Null identifier in login
        res2 = self.client.post("/api/auth/login",
                                data=json.dumps({"identifier": None, "password": "AnyPassword123!"}),
                                content_type="application/json")
        self.assertEqual(res2.status_code, 400)
        self.assertFalse(res2.get_json()["success"])

        # 3. Null email in forgot-password
        res3 = self.client.post("/api/auth/forgot-password",
                                data=json.dumps({"email": None}),
                                content_type="application/json")
        self.assertEqual(res3.status_code, 400)
        self.assertFalse(res3.get_json()["success"])

    def test_19_json_error_handlers(self):
        """Verify that 404 and 405 return clean JSON errors on /api routes."""
        res_404 = self.client.get("/api/auth/nonexistent-endpoint-xyz")
        self.assertEqual(res_404.status_code, 404)
        self.assertTrue(res_404.is_json)
        self.assertFalse(res_404.get_json()["success"])

        res_405 = self.client.delete("/api/auth/register")
        self.assertEqual(res_405.status_code, 405)
        self.assertTrue(res_405.is_json)
        self.assertFalse(res_405.get_json()["success"])

    def test_20_cors_preflight_options(self):
        """Verify CORS preflight OPTIONS returns 200 with appropriate CORS headers."""
        res = self.client.open("/api/auth/login", method="OPTIONS")
        self.assertIn(res.status_code, [200, 204])
        self.assertEqual(res.headers.get("Access-Control-Allow-Origin"), "*")
        self.assertIn("POST", res.headers.get("Access-Control-Allow-Methods", ""))

    def test_21_change_password_and_revoke_all(self):
        """Verify authenticated password change and revoking all other sessions."""
        import time
        ts = int(time.time() * 1000)
        user_name = f"user_pwd_{ts}"
        user_email = f"user_pwd_{ts}@zion.org"
        initial_pw = "OriginalPass123!"
        new_pw = "UpdatedPass456!"

        # Register
        reg_res = self.client.post("/api/auth/register",
                                   data=json.dumps({"username": user_name, "email": user_email, "password": initial_pw}),
                                   content_type="application/json")
        self.assertEqual(reg_res.status_code, 201)
        token1 = reg_res.get_json()["token"]

        # Create second session via login
        login_res = self.client.post("/api/auth/login",
                                     data=json.dumps({"identifier": user_email, "password": initial_pw}),
                                     content_type="application/json")
        self.assertEqual(login_res.status_code, 200)
        token2 = login_res.get_json()["token"]

        # Change password using token2
        change_res = self.client.post("/api/auth/change-password",
                                      headers={"Authorization": f"Bearer {token2}"},
                                      data=json.dumps({"current_password": initial_pw, "new_password": new_pw}),
                                      content_type="application/json")
        self.assertEqual(change_res.status_code, 200)
        self.assertTrue(change_res.get_json()["success"])

        # Revoke other sessions (should revoke token1)
        revoke_res = self.client.post("/api/auth/sessions/revoke-all",
                                      headers={"Authorization": f"Bearer {token2}"})
        self.assertEqual(revoke_res.status_code, 200)
        self.assertTrue(revoke_res.get_json()["success"])

        # Verify token1 is now invalid
        check_t1 = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token1}"})
        self.assertEqual(check_t1.status_code, 401)

        # Verify token2 is still valid
        check_t2 = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token2}"})
        self.assertEqual(check_t2.status_code, 200)

        # Verify login succeeds with new password
        new_login = self.client.post("/api/auth/login",
                                     data=json.dumps({"identifier": user_name, "password": new_pw}),
                                     content_type="application/json")
        self.assertEqual(new_login.status_code, 200)

    def test_22_plus_addressing_email(self):
        """Verify emails with plus addressing (e.g. user+tag@example.com) are accepted."""
        import time
        ts = int(time.time() * 1000)
        plus_email = f"user+{ts}@example.com"
        res = self.client.post("/api/auth/register",
                               data=json.dumps({"username": f"plus_{ts}", "email": plus_email, "password": "CyberPassword2026!"}),
                               content_type="application/json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.get_json()["success"])

if __name__ == "__main__":
    unittest.main()
