"""
Flask RESTful Authentication API with Classy Glossy UI.
Provides secure endpoints for Login, Register, Google OAuth 2.0 Sign-In / Sign-Up,
Active Client Tracking, User Retrieval by Email / Username, Profile inspection & update,
Password change, Session management, Token Refresh, Password Reset, and Audit Logs.
"""
import os
import re
import time
import base64
import json
from functools import wraps
from flask import Flask, request, jsonify, render_template
import database

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SECRET_KEY"] = os.urandom(32).hex()

# Optional Google OAuth Client ID (can also be updated at runtime via /api/auth/oauth/google/config)
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

# Initialize SQLite database schema and indexes
database.init_db()

# Track server start time
SERVER_START_TIME = time.time()

# Standard RFC-compliant email validation
EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

# --------------------------------------------------
# REQUEST & AUTHENTICATION HELPERS
# --------------------------------------------------

def get_client_ip():
    """Extract real client IP address from proxy headers or remote address."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "127.0.0.1"

def get_request_data():
    """Safely extract request dictionary whether sent as JSON or form-data."""
    if request.is_json:
        data = request.get_json(silent=True)
        if isinstance(data, dict):
            return data
    if request.form:
        return request.form.to_dict()
    # Check if raw data has JSON
    try:
        raw_body = request.get_data(as_text=True)
        if raw_body:
            parsed = json.loads(raw_body)
            if isinstance(parsed, dict):
                return parsed
    except Exception:
        pass
    return {}

def extract_token():
    """Extract token from Authorization header (Bearer or raw) or X-Auth-Token header."""
    auth_header = (request.headers.get("Authorization") or "").strip()
    if auth_header:
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()
            if token:
                return token
        elif " " not in auth_header:
            return auth_header

    x_token = (request.headers.get("X-Auth-Token") or "").strip()
    if x_token:
        return x_token

    # Check query param as fallback
    query_token = (request.args.get("token") or "").strip()
    if query_token:
        return query_token

    return None

def require_auth(f):
    """Decorator to protect routes requiring authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_token()
        if not token:
            return jsonify({
                "success": False,
                "error": "Authentication token is missing. Please provide 'Authorization: Bearer <token>'."
            }), 401

        user = database.validate_session(token)
        if not user:
            return jsonify({
                "success": False,
                "error": "Session is invalid or has expired. Please log in again."
            }), 401

        return f(user, *args, **kwargs)
    return decorated

def parse_jwt_payload(token_str):
    """Safely decode JWT payload without external dependencies."""
    try:
        parts = token_str.split(".")
        if len(parts) >= 2:
            payload_b64 = parts[1]
            rem = len(payload_b64) % 4
            if rem > 0:
                payload_b64 += "=" * (4 - rem)
            decoded = base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
            return json.loads(decoded)
    except Exception:
        pass
    return None

# --------------------------------------------------
# CORS & PREFLIGHT CONFIGURATION
# --------------------------------------------------

@app.before_request
def handle_preflight():
    """Respond immediately to OPTIONS preflight requests for CORS."""
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Auth-Token"
        return response

@app.after_request
def add_cors_headers(response):
    """Append CORS headers to all responses."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Auth-Token"
    return response

# --------------------------------------------------
# CUSTOM JSON ERROR HANDLERS
# --------------------------------------------------

@app.errorhandler(404)
def not_found_handler(e):
    if request.path.startswith("/api/"):
        return jsonify({"success": False, "error": f"Endpoint not found: {request.path}"}), 404
    return render_template("index.html"), 404

@app.errorhandler(405)
def method_not_allowed_handler(e):
    if request.path.startswith("/api/"):
        return jsonify({"success": False, "error": f"Method {request.method} is not allowed for {request.path}"}), 405
    return jsonify({"success": False, "error": "Method not allowed"}), 405

@app.errorhandler(400)
def bad_request_handler(e):
    return jsonify({"success": False, "error": "Bad request. Please verify payload formatting."}), 400

@app.errorhandler(500)
def internal_server_error_handler(e):
    return jsonify({"success": False, "error": "Internal server error. Database operation failed."}), 500

# --------------------------------------------------
# WEB UI ROUTE
# --------------------------------------------------

@app.route("/")
def index():
    """Serve the interactive interface."""
    return render_template("index.html")

# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.route("/api/auth/health", methods=["GET"])
def health():
    """API health check and statistics."""
    stats = database.get_stats()
    uptime_seconds = int(time.time() - SERVER_START_TIME)
    return jsonify({
        "success": True,
        "status": "healthy",
        "service": "Glossy Interactive Auth API",
        "version": "1.6.0",
        "uptime_seconds": uptime_seconds,
        "database": "sqlite3 (WAL mode active)",
        "google_oauth_configured": bool(GOOGLE_CLIENT_ID),
        "stats": stats
    }), 200

# --------------------------------------------------
# DEMO CREDENTIALS
# --------------------------------------------------

@app.route("/api/auth/demo-credentials", methods=["GET"])
def get_demo_credentials():
    """Return default demo credentials for quick testing."""
    return jsonify({
        "success": True,
        "demo": {
            "identifier": "demo@glossyapi.dev",
            "password": "GlossyPass123!",
            "note": "Pre-seeded test account with ready-to-use access"
        }
    }), 200

# --------------------------------------------------
# GOOGLE OAUTH
# --------------------------------------------------

@app.route("/api/auth/oauth/google/config", methods=["GET", "POST"])
def google_oauth_config():
    """Get or update Google OAuth configuration."""
    global GOOGLE_CLIENT_ID
    if request.method == "POST":
        data = get_request_data()
        new_client_id = (data.get("client_id") or "").strip()
        GOOGLE_CLIENT_ID = new_client_id
        return jsonify({
            "success": True,
            "client_id": GOOGLE_CLIENT_ID or None,
            "message": "Google Client ID updated successfully."
        }), 200

    return jsonify({
        "success": True,
        "client_id": GOOGLE_CLIENT_ID or None,
        "interactive_simulator_ready": True
    }), 200

@app.route("/api/auth/oauth/google", methods=["POST"])
def google_oauth():
    """Authenticate or Register user using Google OAuth 2.0 (GIS JWT or direct payload)."""
    data = get_request_data()
    client_ip = get_client_ip()

    email = None
    name = None
    google_id = None
    picture = None

    credential = data.get("credential")
    if credential and isinstance(credential, str):
        claims = parse_jwt_payload(credential)
        if claims:
            email = claims.get("email")
            name = claims.get("name")
            google_id = claims.get("sub")
            picture = claims.get("picture")

    if not email:
        email = (data.get("email") or "").strip()
        name = (data.get("name") or "").strip()
        google_id = (data.get("google_id") or "").strip() or f"g_{int(time.time()*1000)}"
        picture = (data.get("picture") or "").strip()

    if not email or not re.match(EMAIL_REGEX, email):
        return jsonify({
            "success": False,
            "error": "A valid Google account email is required."
        }), 400

    user, is_new = database.find_or_create_google_user(
        email=email,
        full_name=name,
        google_id=google_id,
        avatar_url=picture,
        ip_address=client_ip
    )

    user_agent = request.headers.get("User-Agent", "Web Browser")
    device_label = "Google OAuth • Mobile" if "Mobile" in user_agent else "Google OAuth • Desktop"
    token, expires_at = database.create_session(user["id"], duration_hours=168, device_label=device_label, ip_address=client_ip)

    welcome_msg = f"Account created! Welcome, {user.get('full_name')}!" if is_new else f"Welcome back, {user.get('full_name')}!"

    return jsonify({
        "success": True,
        "is_new_user": is_new,
        "message": welcome_msg,
        "token": token,
        "expires_at": expires_at,
        "user": user
    }), 200

# --------------------------------------------------
# REGISTER
# --------------------------------------------------

@app.route("/api/auth/register", methods=["POST"])
def register():
    """Register a new user account."""
    data = get_request_data()
    client_ip = get_client_ip()

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    full_name = (data.get("full_name") or "").strip()

    if not username or len(username) < 3:
        return jsonify({
            "success": False,
            "error": "Username must be at least 3 characters long."
        }), 400

    if not re.match(r"^[a-zA-Z0-9_-]+$", username):
        return jsonify({
            "success": False,
            "error": "Username may only contain letters, numbers, hyphens, and underscores."
        }), 400

    if not email or not re.match(EMAIL_REGEX, email):
        return jsonify({
            "success": False,
            "error": "Please provide a valid email address."
        }), 400

    if not password or len(str(password)) < 6:
        return jsonify({
            "success": False,
            "error": "Password must be at least 6 characters long."
        }), 400

    user, error = database.create_user(username, email, password, full_name, ip_address=client_ip)
    if error:
        return jsonify({
            "success": False,
            "error": error
        }), 409

    token, expires_at = database.create_session(user["id"], duration_hours=24, device_label="Web Client", ip_address=client_ip)

    return jsonify({
        "success": True,
        "is_new_user": True,
        "message": "Account created successfully!",
        "token": token,
        "expires_at": expires_at,
        "user": user
    }), 201

# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@app.route("/api/auth/login", methods=["POST"])
def login():
    """Authenticate user and create session."""
    data = get_request_data()
    client_ip = get_client_ip()

    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""
    remember = bool(data.get("remember", False))

    if not identifier:
        return jsonify({
            "success": False,
            "error": "Email or username is required."
        }), 400

    if not password:
        return jsonify({
            "success": False,
            "error": "Password is required."
        }), 400

    user, error = database.authenticate_user(identifier, password, ip_address=client_ip)
    if error:
        return jsonify({
            "success": False,
            "error": error
        }), 401

    duration_hours = 168 if remember else 24
    user_agent = request.headers.get("User-Agent", "Web Browser")
    device_label = "Mobile Device" if "Mobile" in user_agent else "Desktop Browser"
    token, expires_at = database.create_session(user["id"], duration_hours=duration_hours, device_label=device_label, ip_address=client_ip)

    return jsonify({
        "success": True,
        "is_new_user": False,
        "message": f"Welcome back, {user.get('full_name') or user.get('username')}!",
        "token": token,
        "expires_at": expires_at,
        "user": user
    }), 200

# --------------------------------------------------
# CLIENT TRACKING & REGISTRY
# --------------------------------------------------

@app.route("/api/auth/clients", methods=["GET"])
def list_active_clients():
    """
    List all currently logged-in clients across the system.
    Tracks active sessions, device label, IP address, login time, and user info.
    """
    clients = database.get_active_clients(limit=100)
    return jsonify({
        "success": True,
        "total_active_clients": len(clients),
        "clients": clients
    }), 200

# --------------------------------------------------
# USER LOOKUP & RETRIEVAL (BY EMAIL OR USERNAME)
# --------------------------------------------------

@app.route("/api/auth/users/lookup", methods=["GET"])
def lookup_user_endpoint():
    """
    Retrieve user profile, active session status, and activity by email or username.
    Accepts ?identifier=..., ?email=..., or ?username=...
    """
    identifier = (
        request.args.get("identifier") or 
        request.args.get("email") or 
        request.args.get("username") or 
        request.args.get("q") or ""
    ).strip()

    if not identifier:
        return jsonify({
            "success": False,
            "error": "Please provide an email or username via '?identifier=', '?email=', or '?username=' query parameter."
        }), 400

    result = database.lookup_user(identifier)
    if not result:
        return jsonify({
            "success": False,
            "error": f"No user account found matching '{identifier}'."
        }), 404

    return jsonify({
        "success": True,
        "data": result
    }), 200

@app.route("/api/auth/users/search", methods=["GET"])
def search_users_endpoint():
    """Search users by query string across email, username, and full name."""
    query = (request.args.get("q") or request.args.get("query") or "").strip()
    users = database.search_users(query=query, limit=30)
    return jsonify({
        "success": True,
        "total_matches": len(users),
        "users": users
    }), 200

@app.route("/api/auth/users/<path:identifier>", methods=["GET"])
def get_user_by_identifier(identifier):
    """Retrieve user details and active session status directly by email or username path."""
    clean_id = (identifier or "").strip()
    result = database.lookup_user(clean_id)
    if not result:
        return jsonify({
            "success": False,
            "error": f"User '{clean_id}' was not found in the database."
        }), 404

    return jsonify({
        "success": True,
        "data": result
    }), 200

# --------------------------------------------------
# GET USER PROFILE (SELF)
# --------------------------------------------------

@app.route("/api/auth/me", methods=["GET"])
@require_auth
def get_current_user(user):
    """Retrieve details of the authenticated user."""
    return jsonify({
        "success": True,
        "user": user
    }), 200

# --------------------------------------------------
# UPDATE USER PROFILE (Supports both /profile and /me)
# --------------------------------------------------

@app.route("/api/auth/profile", methods=["PUT", "PATCH", "POST"])
@app.route("/api/auth/me", methods=["PUT", "PATCH", "POST"])
@require_auth
def update_profile(user):
    """Update profile details for authenticated user with robust null/whitespace safety."""
    data = get_request_data()
    client_ip = get_client_ip()

    raw_username = data.get("username")
    raw_full_name = data.get("full_name")
    raw_email = data.get("email")
    raw_avatar = data.get("avatar_url")

    username = raw_username.strip() if (raw_username is not None and isinstance(raw_username, str)) else user["username"]
    full_name = raw_full_name.strip() if (raw_full_name is not None and isinstance(raw_full_name, str)) else user.get("full_name")
    email = raw_email.strip().lower() if (raw_email is not None and isinstance(raw_email, str)) else user.get("email")
    avatar_url = raw_avatar.strip() if (raw_avatar is not None and isinstance(raw_avatar, str)) else user.get("avatar_url")

    if username and len(username) < 3:
        return jsonify({
            "success": False,
            "error": "Username must contain at least 3 characters.",
            "message": "Username must contain at least 3 characters."
        }), 400

    if username and not re.match(r"^[a-zA-Z0-9_-]+$", username):
        return jsonify({
            "success": False,
            "error": "Username may only contain letters, numbers, hyphens, and underscores.",
            "message": "Username may only contain letters, numbers, hyphens, and underscores."
        }), 400

    if email and not re.match(EMAIL_REGEX, email):
        return jsonify({
            "success": False,
            "error": "Please provide a valid email address.",
            "message": "Please provide a valid email address."
        }), 400

    updated_user, error = database.update_user_profile(
        user_id=user["id"],
        username=username,
        full_name=full_name,
        email=email,
        avatar_url=avatar_url,
        ip_address=client_ip
    )

    if error:
        return jsonify({
            "success": False,
            "error": error,
            "message": error
        }), 409

    return jsonify({
        "success": True,
        "message": "Profile updated successfully.",
        "user": updated_user
    }), 200

# --------------------------------------------------
# CHANGE PASSWORD (AUTHENTICATED)
# --------------------------------------------------

@app.route("/api/auth/change-password", methods=["POST"])
@require_auth
def change_password(user):
    """Change password for the currently logged-in user."""
    data = get_request_data()
    client_ip = get_client_ip()

    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if not current_password:
        return jsonify({"success": False, "error": "Current password is required."}), 400

    if not new_password or len(str(new_password)) < 6:
        return jsonify({"success": False, "error": "New password must be at least 6 characters long."}), 400

    success, error = database.change_user_password(user["id"], current_password, new_password, ip_address=client_ip)
    if not success:
        return jsonify({"success": False, "error": error or "Failed to change password."}), 400

    return jsonify({
        "success": True,
        "message": "Password changed successfully."
    }), 200

# --------------------------------------------------
# REFRESH TOKEN
# --------------------------------------------------

@app.route("/api/auth/refresh", methods=["POST"])
def refresh_token():
    """Rotate and extend active session token."""
    data = get_request_data()
    client_ip = get_client_ip()

    token = extract_token() or (data.get("token") or "").strip()
    if not token:
        return jsonify({
            "success": False,
            "error": "Bearer token is required to refresh session."
        }), 401

    new_token, expires_at, error = database.refresh_session_token(token, extension_hours=24, ip_address=client_ip)
    if error:
        return jsonify({
            "success": False,
            "error": error
        }), 401

    return jsonify({
        "success": True,
        "message": "Token refreshed successfully.",
        "token": new_token,
        "expires_at": expires_at
    }), 200

# --------------------------------------------------
# ACTIVE USER SESSIONS
# --------------------------------------------------

@app.route("/api/auth/sessions", methods=["GET"])
@require_auth
def list_sessions(user):
    """Retrieve all active sessions for current user."""
    sessions = database.get_user_sessions(user["id"])
    return jsonify({
        "success": True,
        "total_active_sessions": len(sessions),
        "sessions": sessions
    }), 200

@app.route("/api/auth/sessions/revoke-all", methods=["POST"])
@require_auth
def revoke_all_user_sessions(user):
    """Revoke all active sessions for the user, preserving the current session."""
    client_ip = get_client_ip()
    current_token = extract_token()
    revoked_count = database.revoke_all_sessions(user["id"], except_token=current_token, ip_address=client_ip)
    return jsonify({
        "success": True,
        "message": f"Successfully revoked {revoked_count} other active session(s).",
        "revoked_count": revoked_count
    }), 200

# --------------------------------------------------
# SECURITY AUDIT LOGS
# --------------------------------------------------

@app.route("/api/auth/audit-logs", methods=["GET"])
@require_auth
def list_audit_logs(user):
    """Retrieve security audit logs for current user."""
    logs = database.get_user_audit_logs(user["id"], limit=15)
    return jsonify({
        "success": True,
        "audit_logs": logs
    }), 200

# --------------------------------------------------
# FORGOT PASSWORD
# --------------------------------------------------

@app.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    """Generate a 6-digit verification code to reset password."""
    data = get_request_data()
    client_ip = get_client_ip()
    email = (data.get("email") or "").strip()

    if not email:
        return jsonify({"success": False, "error": "Email address is required."}), 400

    code, error = database.create_password_reset(email, ip_address=client_ip)
    if error:
        return jsonify({"success": False, "error": error}), 404

    return jsonify({
        "success": True,
        "message": f"Verification code generated for {email}.",
        "reset_code": code,
        "expires_in_minutes": 15
    }), 200

# --------------------------------------------------
# RESET PASSWORD
# --------------------------------------------------

@app.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    """Reset user password using verification code."""
    data = get_request_data()
    client_ip = get_client_ip()

    reset_code = (data.get("reset_code") or "").strip()
    new_password = data.get("new_password") or ""

    if not reset_code:
        return jsonify({"success": False, "error": "Reset code is required."}), 400

    if not new_password or len(str(new_password)) < 6:
        return jsonify({"success": False, "error": "New password must be at least 6 characters long."}), 400

    success, error = database.reset_password_with_code(reset_code, new_password, ip_address=client_ip)
    if not success:
        return jsonify({"success": False, "error": error}), 400

    return jsonify({
        "success": True,
        "message": "Password updated successfully! All active sessions have been securely revoked."
    }), 200

# --------------------------------------------------
# LOGOUT
# --------------------------------------------------

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    """Invalidate current session token."""
    data = get_request_data()
    client_ip = get_client_ip()

    token = extract_token() or (data.get("token") or "").strip()
    if not token:
        return jsonify({
            "success": False,
            "error": "No token provided."
        }), 400

    success = database.destroy_session(token, ip_address=client_ip)
    return jsonify({
        "success": True,
        "message": "Session terminated successfully." if success else "Session was already expired or inactive."
    }), 200

# --------------------------------------------------
# API SPECIFICATION
# --------------------------------------------------

@app.route("/api/auth/spec", methods=["GET"])
def api_spec():
    """API documentation and endpoint schema."""
    endpoints = [
        {
            "name": "Google OAuth Sign-Up / Sign-In",
            "method": "POST",
            "path": "/api/auth/oauth/google",
            "auth_required": False,
            "description": "Authenticates or registers user using Google profile or GIS JWT payload.",
            "sample_body": {
                "email": "alex.mercer.dev@gmail.com",
                "name": "Alex Mercer",
                "google_id": "10492847291048291048",
                "picture": "https://lh3.googleusercontent.com/a/default-user"
            }
        },
        {
            "name": "List Active Logged-In Clients",
            "method": "GET",
            "path": "/api/auth/clients",
            "auth_required": False,
            "description": "Retrieves all currently active logged-in client sessions across the system.",
            "sample_body": None
        },
        {
            "name": "Lookup User by Email or Username",
            "method": "GET",
            "path": "/api/auth/users/lookup",
            "auth_required": False,
            "description": "Checks and retrieves user details, active sessions, and activity via '?identifier='.",
            "sample_body": None
        },
        {
            "name": "Direct User Lookup by Path",
            "method": "GET",
            "path": "/api/auth/users/<identifier>",
            "auth_required": False,
            "description": "Retrieves user and active session status directly (e.g. /api/auth/users/demo@glossyapi.dev).",
            "sample_body": None
        },
        {
            "name": "Search Users",
            "method": "GET",
            "path": "/api/auth/users/search",
            "auth_required": False,
            "description": "Searches users by partial email, username, or full name.",
            "sample_body": None
        },
        {
            "name": "User Login",
            "method": "POST",
            "path": "/api/auth/login",
            "auth_required": False,
            "description": "Authenticates user with username/email and password.",
            "sample_body": {
                "identifier": "demo@glossyapi.dev",
                "password": "GlossyPass123!",
                "remember": True
            }
        },
        {
            "name": "User Registration",
            "method": "POST",
            "path": "/api/auth/register",
            "auth_required": False,
            "description": "Registers a new user account.",
            "sample_body": {
                "username": "sarah_connor",
                "email": "sarah@cyberdyne.org",
                "password": "SafePassword2026!",
                "full_name": "Sarah Connor"
            }
        },
        {
            "name": "Get Authenticated Profile",
            "method": "GET",
            "path": "/api/auth/me",
            "auth_required": True,
            "description": "Returns current user details using Bearer token.",
            "sample_body": None
        },
        {
            "name": "Update User Profile",
            "method": "PUT",
            "path": "/api/auth/profile",
            "auth_required": True,
            "description": "Updates username, full name, or email for current user.",
            "sample_body": {
                "username": "alex_updated",
                "full_name": "Alex Mercer Jr."
            }
        },
        {
            "name": "Change Password",
            "method": "POST",
            "path": "/api/auth/change-password",
            "auth_required": True,
            "description": "Changes password for current user verified by old password.",
            "sample_body": {
                "current_password": "OldPassword123!",
                "new_password": "NewSecretPassword2026!"
            }
        },
        {
            "name": "Refresh Token",
            "method": "POST",
            "path": "/api/auth/refresh",
            "auth_required": True,
            "description": "Rotates the active session token.",
            "sample_body": None
        },
        {
            "name": "Active User Sessions",
            "method": "GET",
            "path": "/api/auth/sessions",
            "auth_required": True,
            "description": "Lists active sessions for the user.",
            "sample_body": None
        },
        {
            "name": "Revoke All Other Sessions",
            "method": "POST",
            "path": "/api/auth/sessions/revoke-all",
            "auth_required": True,
            "description": "Signs out of all devices except the current session.",
            "sample_body": None
        },
        {
            "name": "Security Audit Logs",
            "method": "GET",
            "path": "/api/auth/audit-logs",
            "auth_required": True,
            "description": "Lists recent security events for the user.",
            "sample_body": None
        },
        {
            "name": "Forgot Password",
            "method": "POST",
            "path": "/api/auth/forgot-password",
            "auth_required": False,
            "description": "Generates a 6-digit OTP reset code.",
            "sample_body": {"email": "demo@glossyapi.dev"}
        },
        {
            "name": "Reset Password",
            "method": "POST",
            "path": "/api/auth/reset-password",
            "auth_required": False,
            "description": "Resets password with OTP reset code.",
            "sample_body": {"reset_code": "123456", "new_password": "NewSecretPassword2026!"}
        },
        {
            "name": "Logout Session",
            "method": "POST",
            "path": "/api/auth/logout",
            "auth_required": True,
            "description": "Invalidates the active session token.",
            "sample_body": None
        },
        {
            "name": "Health & Metrics",
            "method": "GET",
            "path": "/api/auth/health",
            "auth_required": False,
            "description": "Returns server status and database metrics.",
            "sample_body": None
        }
    ]
    return jsonify({"success": True, "endpoints": endpoints}), 200

# --------------------------------------------------
# START FLASK SERVER
# --------------------------------------------------

if __name__ == "__main__":
    print("✨ Starting Glossy Auth API on http://127.0.0.1:5000 ✨")
    app.run(host="127.0.0.1", port=5000, debug=True)
