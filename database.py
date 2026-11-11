"""
Database initialization and management for the Glossy Auth API.
Uses SQLite for zero-setup, robust local persistence.
Supports users, sessions, password resets, Google & GitHub OAuth, session auditing, and security logs.
"""
import sqlite3
import os
import uuid
import secrets
import re
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), "auth.db")
EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

def get_connection():
    """
    Get a database connection with dict-like row factory and integrity settings.
    Uses 30-second busy timeout to prevent 'database is locked' errors under concurrent load.
    """
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 30000")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables, indexes, and create a default demo account."""
    conn = get_connection()
    try:
        cursor = conn.cursor()

        # Create users table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL COLLATE NOCASE,
            email TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            auth_provider TEXT DEFAULT 'local',
            google_id TEXT,
            github_id TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
        """)

        # Check and add missing columns for backward compatibility
        cursor.execute("PRAGMA table_info(users)")
        existing_cols = [row["name"] for row in cursor.fetchall()]
        if "auth_provider" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'")
        if "google_id" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN google_id TEXT")
        if "github_id" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN github_id TEXT")
        if "avatar_url" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")
        if "full_name" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN full_name TEXT")
        if "last_login" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN last_login TIMESTAMP")

        # Create sessions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            device_label TEXT DEFAULT 'Desktop Browser',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """)

        # Check and add missing columns for sessions
        cursor.execute("PRAGMA table_info(sessions)")
        existing_sess_cols = [row["name"] for row in cursor.fetchall()]
        if "device_label" not in existing_sess_cols:
            cursor.execute("ALTER TABLE sessions ADD COLUMN device_label TEXT DEFAULT 'Desktop Browser'")

        # Create password resets table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            reset_code TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            used INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """)

        # Create security audit logs table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            description TEXT NOT NULL,
            ip_address TEXT DEFAULT '127.0.0.1',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """)

        # Create performance and query indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email COLLATE NOCASE)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_password_resets_code ON password_resets(reset_code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC)")

        # Seed demo user if not present
        cursor.execute("SELECT id FROM users WHERE email = ?", ("demo@glossyapi.dev",))
        demo_user = cursor.fetchone()
        if not demo_user:
            hashed_pw = generate_password_hash("GlossyPass123!", method="scrypt")
            cursor.execute("""
                INSERT INTO users (username, email, password_hash, full_name, auth_provider, created_at)
                VALUES (?, ?, ?, ?, 'local', ?)
            """, ("AlexGlossy", "demo@glossyapi.dev", hashed_pw, "Alex Mercer", datetime.utcnow().isoformat()))

        conn.commit()
        # Clean up any stale/expired tokens on init
        cleanup_expired_records(conn)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def cleanup_expired_records(existing_conn=None):
    """Purge expired sessions and stale password reset codes."""
    conn = existing_conn or get_connection()
    should_close = existing_conn is None
    try:
        now_str = datetime.utcnow().isoformat()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE expires_at < ?", (now_str,))
        cursor.execute("DELETE FROM password_resets WHERE expires_at < ? OR used = 1", (now_str,))
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        if should_close:
            conn.close()

def create_user(username, email, password, full_name=None, ip_address="127.0.0.1"):
    """Register a new user account with validation."""
    clean_username = (username or "").strip()
    clean_email = (email or "").strip().lower()
    clean_fullname = (full_name or "").strip() if full_name else clean_username

    if not clean_username or len(clean_username) < 3:
        return None, "Username must be at least 3 characters long."

    if not re.match(r"^[a-zA-Z0-9_-]+$", clean_username):
        return None, "Username may only contain letters, numbers, hyphens, and underscores."

    if not clean_email or not re.match(EMAIL_REGEX, clean_email):
        return None, "Please provide a valid email address."

    if not password or len(str(password)) < 6:
        return None, "Password must be at least 6 characters long."

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM users WHERE username = ?", (clean_username,))
        if cursor.fetchone():
            return None, "Username is already taken"

        cursor.execute("SELECT id FROM users WHERE email = ?", (clean_email,))
        if cursor.fetchone():
            return None, "Email is already registered"

        hashed_pw = generate_password_hash(str(password), method="scrypt")
        now_str = datetime.utcnow().isoformat()

        cursor.execute("""
            INSERT INTO users (username, email, password_hash, full_name, auth_provider, created_at)
            VALUES (?, ?, ?, ?, 'local', ?)
        """, (clean_username, clean_email, hashed_pw, clean_fullname, now_str))
        conn.commit()
        user_id = cursor.lastrowid
        log_audit_event(user_id, "register_local", f"Account created with username @{clean_username}", ip_address=ip_address)
        return get_user_by_id(user_id), None
    except sqlite3.IntegrityError:
        conn.rollback()
        return None, "Username or email is already taken"
    except Exception as e:
        conn.rollback()
        return None, str(e)
    finally:
        conn.close()

def find_or_create_google_user(email, full_name=None, google_id=None, avatar_url=None, ip_address="127.0.0.1"):
    """Find existing user by email or Google ID, or create a new Google-authenticated user."""
    clean_email = (email or "").strip().lower()
    clean_google_id = (google_id or "").strip() or None
    clean_avatar = (avatar_url or "").strip() or None
    clean_name = (full_name or "").strip() if full_name else None

    conn = get_connection()
    cursor = conn.cursor()
    try:
        now_str = datetime.utcnow().isoformat()

        if clean_google_id:
            cursor.execute("SELECT * FROM users WHERE google_id = ? OR email = ?", (clean_google_id, clean_email))
        else:
            cursor.execute("SELECT * FROM users WHERE email = ?", (clean_email,))

        row = cursor.fetchone()

        if row:
            user_id = row["id"]
            cursor.execute("""
                UPDATE users 
                SET last_login = ?, 
                    google_id = COALESCE(?, google_id),
                    avatar_url = COALESCE(?, avatar_url),
                    full_name = COALESCE(?, full_name)
                WHERE id = ?
            """, (now_str, clean_google_id, clean_avatar, clean_name, user_id))
            conn.commit()
            log_audit_event(user_id, "login_google", f"Signed in with Google OAuth ({clean_email})", ip_address=ip_address)
            return get_user_by_id(user_id), False

        base_username = clean_email.split("@")[0] if "@" in clean_email else "google_user"
        base_username = re.sub(r"[^a-zA-Z0-9_]", "_", base_username)[:15] or "google_user"
        candidate_username = base_username

        counter = 1
        while True:
            cursor.execute("SELECT id FROM users WHERE username = ?", (candidate_username,))
            if not cursor.fetchone():
                break
            candidate_username = f"{base_username}_{counter}"
            counter += 1

        dummy_hash = generate_password_hash(secrets.token_hex(32), method="scrypt")
        display_name = clean_name if clean_name else candidate_username.replace("_", " ").title()

        cursor.execute("""
            INSERT INTO users (username, email, password_hash, full_name, auth_provider, google_id, avatar_url, created_at, last_login)
            VALUES (?, ?, ?, ?, 'google', ?, ?, ?, ?)
        """, (candidate_username, clean_email, dummy_hash, display_name, clean_google_id, clean_avatar, now_str, now_str))
        conn.commit()
        new_id = cursor.lastrowid
        log_audit_event(new_id, "register_google", f"Account provisioned via Google OAuth ({clean_email})", ip_address=ip_address)
        return get_user_by_id(new_id), True
    except sqlite3.IntegrityError:
        conn.rollback()
        # Fallback in case of concurrent insert race condition: fetch and return existing
        cursor.execute("SELECT * FROM users WHERE email = ?", (clean_email,))
        existing_row = cursor.fetchone()
        if existing_row:
            return get_user_by_id(existing_row["id"]), False
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def find_or_create_github_user(username, email=None, full_name=None, github_id=None, avatar_url=None, ip_address="127.0.0.1"):
    """Find existing user by username, email, or GitHub ID, or create a new GitHub-authenticated user."""
    clean_user = (username or "").strip()
    clean_email = (email or "").strip().lower() if email else f"{clean_user.lower()}@github.oauth"
    clean_github_id = (github_id or "").strip() or None
    clean_avatar = (avatar_url or "").strip() or None
    clean_name = (full_name or "").strip() if full_name else clean_user

    conn = get_connection()
    cursor = conn.cursor()
    try:
        now_str = datetime.utcnow().isoformat()

        if clean_github_id:
            cursor.execute("SELECT * FROM users WHERE github_id = ? OR email = ? OR username = ?", (clean_github_id, clean_email, clean_user))
        else:
            cursor.execute("SELECT * FROM users WHERE email = ? OR username = ?", (clean_email, clean_user))

        row = cursor.fetchone()

        if row:
            user_id = row["id"]
            cursor.execute("""
                UPDATE users 
                SET last_login = ?, 
                    github_id = COALESCE(?, github_id),
                    avatar_url = COALESCE(?, avatar_url),
                    full_name = COALESCE(?, full_name)
                WHERE id = ?
            """, (now_str, clean_github_id, clean_avatar, clean_name, user_id))
            conn.commit()
            log_audit_event(user_id, "login_github", f"Signed in with GitHub OAuth (@{clean_user})", ip_address=ip_address)
            return get_user_by_id(user_id), False

        dummy_hash = generate_password_hash(secrets.token_hex(32), method="scrypt")

        cursor.execute("""
            INSERT INTO users (username, email, password_hash, full_name, auth_provider, github_id, avatar_url, created_at, last_login)
            VALUES (?, ?, ?, ?, 'github', ?, ?, ?, ?)
        """, (clean_user, clean_email, dummy_hash, clean_name, clean_github_id, clean_avatar, now_str, now_str))
        conn.commit()
        new_id = cursor.lastrowid
        log_audit_event(new_id, "register_github", f"Account provisioned via GitHub OAuth (@{clean_user})", ip_address=ip_address)
        return get_user_by_id(new_id), True
    except sqlite3.IntegrityError:
        conn.rollback()
        cursor.execute("SELECT * FROM users WHERE username = ? OR email = ?", (clean_user, clean_email))
        existing_row = cursor.fetchone()
        if existing_row:
            return get_user_by_id(existing_row["id"]), False
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def authenticate_user(identifier, password, ip_address="127.0.0.1"):
    """Authenticate by username or email. Returns (user_dict, error)."""
    ident = (identifier or "").strip()
    if not ident:
        return None, "Email or username is required."

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT * FROM users 
            WHERE email = ? OR username = ?
        """, (ident.lower(), ident))
        row = cursor.fetchone()

        if not row:
            return None, "Invalid credentials. Account not found."

        if not check_password_hash(row["password_hash"], str(password)):
            return None, "Invalid credentials. Password incorrect."

        now_str = datetime.utcnow().isoformat()
        cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (now_str, row["id"]))
        conn.commit()

        user_data = dict(row)
        user_data.pop("password_hash", None)
        user_data["last_login"] = now_str
        log_audit_event(row["id"], "login_local", f"Authenticated with password as @{row['username']}", ip_address=ip_address)
        return user_data, None
    except Exception as e:
        conn.rollback()
        return None, str(e)
    finally:
        conn.close()

def update_user_profile(user_id, username=None, full_name=None, email=None, avatar_url=None, ip_address="127.0.0.1"):
    """Update profile details for an existing user with strict field sanitization."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, username, email, full_name, avatar_url FROM users WHERE id = ?", (user_id,))
        existing = cursor.fetchone()
        if not existing:
            return None, "User not found."

        # Process and validate username
        if username is not None:
            clean_username = username.strip()
            if not clean_username:
                return None, "Username cannot be empty."
            if len(clean_username) < 3:
                return None, "Username must contain at least 3 characters."
            if not re.match(r"^[a-zA-Z0-9_-]+$", clean_username):
                return None, "Username may only contain letters, numbers, hyphens, and underscores."
            new_username = clean_username
        else:
            new_username = existing["username"]

        # Process full_name
        if full_name is not None:
            new_full_name = full_name.strip()
        else:
            new_full_name = existing["full_name"]

        # Process and validate email
        if email is not None:
            clean_email = email.strip().lower()
            if not clean_email:
                return None, "Email cannot be empty."
            if not re.match(EMAIL_REGEX, clean_email):
                return None, "Please provide a valid email address."
            new_email = clean_email
        else:
            new_email = existing["email"]

        # Process avatar
        new_avatar = avatar_url.strip() if (avatar_url and isinstance(avatar_url, str)) else existing["avatar_url"]

        # Check if username is taken by another user
        if new_username.lower() != existing["username"].lower():
            cursor.execute("SELECT id FROM users WHERE username = ? AND id != ?", (new_username, user_id))
            if cursor.fetchone():
                return None, "Username is already taken."

        # Check if email is taken by another user
        if new_email.lower() != existing["email"].lower():
            cursor.execute("SELECT id FROM users WHERE email = ? AND id != ?", (new_email, user_id))
            if cursor.fetchone():
                return None, "Email is already registered by another account."

        cursor.execute("""
            UPDATE users
            SET username = ?, full_name = ?, email = ?, avatar_url = ?
            WHERE id = ?
        """, (new_username, new_full_name, new_email, new_avatar, user_id))
        conn.commit()

        log_audit_event(user_id, "profile_update", f"Profile updated for @{new_username}", ip_address=ip_address)
        return get_user_by_id(user_id), None
    except sqlite3.IntegrityError:
        conn.rollback()
        return None, "Username or email is already taken."
    except Exception as e:
        conn.rollback()
        return None, str(e)
    finally:
        conn.close()

def change_user_password(user_id, current_password, new_password, ip_address="127.0.0.1"):
    """Change password for an authenticated user with verification of current password."""
    if not new_password or len(str(new_password)) < 6:
        return False, "New password must be at least 6 characters long."

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            return False, "User not found."

        if not check_password_hash(row["password_hash"], str(current_password)):
            return False, "Current password does not match."

        new_hash = generate_password_hash(str(new_password), method="scrypt")
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user_id))
        conn.commit()
        log_audit_event(user_id, "password_change", "Password successfully changed via account settings", ip_address=ip_address)
        return True, None
    except Exception as e:
        conn.rollback()
        return False, str(e)
    finally:
        conn.close()

def create_session(user_id, duration_hours=24, device_label="Web Client"):
    """Create a persistent cryptographically secure session token."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        token = f"glossy_{secrets.token_hex(20)}"
        now = datetime.utcnow()
        expires = now + timedelta(hours=duration_hours)
        cursor.execute("""
            INSERT INTO sessions (token, user_id, device_label, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
        """, (token, user_id, device_label, now.isoformat(), expires.isoformat()))
        conn.commit()
        return token, expires.isoformat()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def validate_session(token):
    """Validate token, handle expiration safely, and return associated user."""
    if not token or not isinstance(token, str):
        return None

    clean_token = token.strip()
    if not clean_token:
        return None

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT s.token, s.expires_at, s.device_label, u.id, u.username, u.email, u.full_name, u.auth_provider, u.avatar_url, u.created_at, u.last_login
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ?
        """, (clean_token,))
        row = cursor.fetchone()
        if not row:
            return None

        # Robust ISO timestamp parsing (timezone-aware & naive safe)
        expires_str = row["expires_at"]
        try:
            expires_at = datetime.fromisoformat(expires_str.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc) if expires_at.tzinfo else datetime.utcnow()
            if now_dt > expires_at:
                cursor.execute("DELETE FROM sessions WHERE token = ?", (clean_token,))
                conn.commit()
                return None
        except Exception:
            # Fallback string comparison for standard ISO strings
            if datetime.utcnow().isoformat() > expires_str:
                cursor.execute("DELETE FROM sessions WHERE token = ?", (clean_token,))
                conn.commit()
                return None

        return dict(row)
    except Exception:
        conn.rollback()
        return None
    finally:
        conn.close()

def refresh_session_token(old_token, extension_hours=24, ip_address="127.0.0.1"):
    """Invalidate old token and issue a fresh one with extended expiration."""
    user = validate_session(old_token)
    if not user:
        return None, None, "Session is invalid or expired."
    destroy_session(old_token)
    new_token, expires_at = create_session(user["id"], duration_hours=extension_hours, device_label=user.get("device_label", "Refreshed Session"))
    log_audit_event(user["id"], "token_refresh", "Rotated session token and extended expiration", ip_address=ip_address)
    return new_token, expires_at, None

def destroy_session(token, ip_address="127.0.0.1"):
    """Log out / invalidate a session token and record security log."""
    if not token or not isinstance(token, str):
        return False
    clean_token = token.strip()
    if not clean_token:
        return False

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id FROM sessions WHERE token = ?", (clean_token,))
        row = cursor.fetchone()
        if not row:
            return False

        user_id = row["user_id"]
        cursor.execute("DELETE FROM sessions WHERE token = ?", (clean_token,))
        conn.commit()
        log_audit_event(user_id, "logout", "Session token revoked / signed out", ip_address=ip_address)
        return True
    except Exception:
        conn.rollback()
        return False
    finally:
        conn.close()

def revoke_all_sessions(user_id, except_token=None, ip_address="127.0.0.1"):
    """Revoke all sessions for a user, optionally preserving current active session."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        if except_token:
            cursor.execute("DELETE FROM sessions WHERE user_id = ? AND token != ?", (user_id, except_token))
        else:
            cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        count = cursor.rowcount
        conn.commit()
        log_audit_event(user_id, "revoke_all_sessions", f"Terminated {count} active sessions", ip_address=ip_address)
        return count
    except Exception:
        conn.rollback()
        return 0
    finally:
        conn.close()

def get_user_sessions(user_id):
    """List all active sessions for a user."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        now_str = datetime.utcnow().isoformat()
        cursor.execute("""
            SELECT token, device_label, created_at, expires_at
            FROM sessions
            WHERE user_id = ? AND expires_at > ?
            ORDER BY created_at DESC
        """, (user_id, now_str))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

def create_password_reset(email, ip_address="127.0.0.1"):
    """Generate a cryptographically secure 6-digit reset code valid for 15 minutes."""
    clean_email = (email or "").strip().lower()
    if not clean_email:
        return None, "Email address is required."

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM users WHERE email = ?", (clean_email,))
        row = cursor.fetchone()
        if not row:
            return None, "No account exists with this email address."

        user_id = row["id"]

        # Invalidate any previously generated unused reset codes for this user
        cursor.execute("UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0", (user_id,))

        # Cryptographically secure random 6-digit code
        reset_code = f"{secrets.randbelow(900000) + 100000}"
        now = datetime.utcnow()
        expires = now + timedelta(minutes=15)

        cursor.execute("""
            INSERT INTO password_resets (reset_code, user_id, created_at, expires_at, used)
            VALUES (?, ?, ?, ?, 0)
        """, (reset_code, user_id, now.isoformat(), expires.isoformat()))
        conn.commit()
        log_audit_event(user_id, "password_reset_request", f"Requested 6-digit verification code ({reset_code})", ip_address=ip_address)
        return reset_code, None
    except Exception as e:
        conn.rollback()
        return None, str(e)
    finally:
        conn.close()

def reset_password_with_code(reset_code, new_password, ip_address="127.0.0.1"):
    """Verify reset code and update password atomically."""
    clean_code = (reset_code or "").strip()
    if not clean_code:
        return False, "Reset code is required."

    if not new_password or len(str(new_password)) < 6:
        return False, "New password must be at least 6 characters long."

    conn = get_connection()
    cursor = conn.cursor()
    try:
        now_str = datetime.utcnow().isoformat()
        cursor.execute("""
            SELECT * FROM password_resets
            WHERE reset_code = ? AND used = 0 AND expires_at > ?
        """, (clean_code, now_str))
        reset_row = cursor.fetchone()
        if not reset_row:
            return False, "Invalid or expired reset code."

        user_id = reset_row["user_id"]
        new_hash = generate_password_hash(str(new_password), method="scrypt")

        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user_id))
        cursor.execute("UPDATE password_resets SET used = 1 WHERE reset_code = ?", (clean_code,))
        cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        conn.commit()
        log_audit_event(user_id, "password_reset_success", "Password updated with verification code; old sessions revoked", ip_address=ip_address)
        return True, None
    except Exception as e:
        conn.rollback()
        return False, str(e)
    finally:
        conn.close()

def log_audit_event(user_id, event_type, description, ip_address="127.0.0.1"):
    """Record a security audit log event."""
    if not user_id:
        return
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO audit_logs (user_id, event_type, description, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, event_type, description, ip_address or "127.0.0.1", datetime.utcnow().isoformat()))
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        conn.close()

def get_user_audit_logs(user_id, limit=10):
    """Retrieve recent security audit logs for a user."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT event_type, description, ip_address, created_at
            FROM audit_logs
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        """, (user_id, limit))
        return [dict(r) for r in cursor.fetchall()]
    finally:
        conn.close()

def get_user_by_id(user_id):
    """Retrieve user dictionary without sensitive hash."""
    if not user_id:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, username, email, full_name, auth_provider, avatar_url, created_at, last_login 
            FROM users 
            WHERE id = ?
        """, (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def get_user_by_email(email):
    """Lookup user by email address."""
    clean_email = (email or "").strip().lower()
    if not clean_email:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, username, email, full_name, auth_provider, avatar_url, created_at, last_login 
            FROM users 
            WHERE email = ?
        """, (clean_email,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def get_user_by_username(username):
    """Lookup user by username."""
    clean_username = (username or "").strip()
    if not clean_username:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, username, email, full_name, auth_provider, avatar_url, created_at, last_login 
            FROM users 
            WHERE username = ?
        """, (clean_username,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def delete_user(user_id):
    """Delete a user account and cascade delete all sessions and audit logs."""
    if not user_id:
        return False
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        count = cursor.rowcount
        conn.commit()
        return count > 0
    except Exception:
        conn.rollback()
        return False
    finally:
        conn.close()

def get_stats():
    """Retrieve database metrics, running cleanups on the fly."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cleanup_expired_records(conn)
        cursor.execute("SELECT COUNT(*) AS total_users FROM users")
        total_users = cursor.fetchone()["total_users"]
        cursor.execute("SELECT COUNT(*) AS active_sessions FROM sessions WHERE expires_at > ?", (datetime.utcnow().isoformat(),))
        active_sessions = cursor.fetchone()["active_sessions"]
        cursor.execute("SELECT COUNT(*) AS total_audit_logs FROM audit_logs")
        total_logs = cursor.fetchone()["total_audit_logs"]
        return {
            "total_users": total_users,
            "active_sessions": active_sessions,
            "total_audit_logs": total_logs
        }
    finally:
        conn.close()
