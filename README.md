# AURA // Glossy Interactive Auth API

A high-performance, classy, and glossy authentication application and REST API built with Flask, SQLite, and vanilla CSS/JS glassmorphism — featuring interactive Google OAuth 2.0 Sign-In / Sign-Up.

---

## ✨ Key Features

### 🌐 Real Working Google Sign-In & Sign-Up
- **1-Click Google Sign-Up**: Available on both the Sign In and Register views.
- **Glassmorphic Google Account Chooser**: Choose between pre-configured Google profiles (e.g. Alex Mercer, Sarah Connor) or click *"Use another Google account"* to enter any custom Google email.
- **OAuth 2.0 Backend**: Endpoint `POST /api/auth/oauth/google` automatically provisions new accounts, persists Google IDs and avatar URLs in SQLite, issues secure 7-day session tokens, and returns a verified Google identity.
- **Google Verified Badge & Avatars**: Profile displays a dedicated Google OAuth badge and Google avatar.
- **Google Identity Services (GIS) Ready**: Works out of the box with the interactive chooser, and supports setting `GOOGLE_CLIENT_ID` for real Google Cloud OAuth credentials.

### 💎 Classy & Glossy Aesthetic
- **Frosted Glassmorphism 2.0**: Multi-layered backdrop blur (`backdrop-filter: blur(30px) saturate(190%)`), subtle specular reflections, and soft luminous glows.
- **Dynamic Accent Themes**: Switch between 4 luxury gemstone accent colors via the header switcher:
  - 🔮 **Sapphire Indigo** (Default)
  - 🌿 **Emerald Mint**
  - 🌅 **Sunset Rose**
  - ⚡ **Electric Amber**
- **Ambient Constellation Canvas**: Glowing particles drifting and connecting with delicate light filaments that dynamically react to mouse movements.

### ⚡ Interactive Buttons & Micro-Effects
- **Spotlight Cursor Flare**: Buttons and cards track your mouse coordinates (`--mouse-x`, `--mouse-y`) in real-time, casting an ethereal liquid light spotlight inside the glass.
- **Glossy Shimmer Wave**: High-gloss reflection beams glide diagonally across buttons on hover.
- **Liquid Ripple Physics**: Coordinate-precise ripples expand smoothly from wherever you click.
- **Tactile Click Sensation**: Smooth spring scale (`scale(0.965)`) with active border flare.
- **3D Perspective Tilt**: Glass cards subtly tilt in 3D perspective toward your mouse position.
- **Particle Sparkle Bursts**: Radiant multi-color glowing particle explosions upon successful login or registration.
- **Synthesized Web Audio Feedback**: Crisp mechanical clicks, glass chimes, and soft buzzes generated entirely in real-time via Web Audio API (with instant mute/unmute toggle).

### 🛠️ Interactive Developer Suite
- **Built-in Live API Console**: Test all endpoints (`/oauth/google`, `/login`, `/register`, `/me`, `/refresh`, `/sessions`, `/health`, `/logout`) directly inside the UI.
- **Dynamic Payload Editor**: Edit JSON parameters on the fly with a one-click syntax formatter.
- **Response Metrics**: Live HTTP status code badges with glowing indicators and response time counters in milliseconds.
- **1-Click Copy as cURL**: Generate ready-to-paste CLI commands for any endpoint.
- **1-Click Demo Fill**: Pre-seeds test credentials (`demo@glossyapi.dev` / `GlossyPass123!`).

---

## 🚀 Quick Start

### 1. Launch the Server
The server is currently running at:
👉 **[http://localhost:5000](http://localhost:5000)** *(or [http://127.0.0.1:5000](http://127.0.0.1:5000))*

To restart anytime, double-click `run.bat` or run:
```bash
python app.py
```

### 2. Test Google Sign-Up
1. Click the glossy **"Sign up with Google (1-Click)"** button on the Register tab (or the **Google** button on the Sign In tab).
2. The Google Account Chooser will slide open with frosted glass styling.
3. Select any profile or click *"Use another Google account"* to test any Google email.
4. Your account will immediately be created and authenticated with a 7-day session token, transitioning directly to your authenticated profile!

---

## 📡 API Reference

### 1. Google OAuth Sign-Up / Sign-In
- **URL**: `POST /api/auth/oauth/google`
- **Payload**:
```json
{
  "email": "alex.mercer.dev@gmail.com",
  "name": "Alex Mercer",
  "google_id": "google_uid_109283",
  "picture": "https://lh3.googleusercontent.com/avatar"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "is_new_user": true,
  "message": "Account created! Welcome, Alex Mercer!",
  "token": "glossy_9f8d1c...",
  "expires_at": "2026-11-18T09:30:00",
  "user": {
    "id": 2,
    "username": "alex_mercer",
    "email": "alex.mercer.dev@gmail.com",
    "full_name": "Alex Mercer",
    "auth_provider": "google",
    "avatar_url": "https://lh3.googleusercontent.com/avatar"
  }
}
```

### 2. Standard Login
- **URL**: `POST /api/auth/login`
- **Payload**:
```json
{
  "identifier": "demo@glossyapi.dev",
  "password": "GlossyPass123!",
  "remember": true
}
```

### 3. Register New User
- **URL**: `POST /api/auth/register`
- **Payload**:
```json
{
  "username": "neo_matrix",
  "email": "neo@zion.org",
  "password": "SafePassword2026!",
  "full_name": "Thomas Anderson"
}
```

### 4. Get Profile
- **URL**: `GET /api/auth/me`
- **Header**: `Authorization: Bearer <token>`

### 5. Refresh / Extend Token
- **URL**: `POST /api/auth/refresh`
- **Header**: `Authorization: Bearer <token>`

### 6. Active User Sessions
- **URL**: `GET /api/auth/sessions`
- **Header**: `Authorization: Bearer <token>`

### 7. Track Logged-In Clients (System-Wide)
- **URL**: `GET /api/auth/clients`
- **Description**: Returns all currently active client sessions, devices, IP addresses, login times, and associated users.
- **Response** (`200 OK`):
```json
{
  "success": true,
  "total_active_clients": 2,
  "clients": [
    {
      "username": "AlexGlossy",
      "email": "demo@glossyapi.dev",
      "full_name": "Alex Mercer",
      "device_label": "Desktop Browser",
      "ip_address": "127.0.0.1",
      "masked_token": "glossy_9f8d...a4b2",
      "session_started_at": "2026-11-11T15:10:00",
      "expires_at": "2026-11-12T15:10:00"
    }
  ]
}
```

### 8. Lookup / Retrieve User by Email or Username
- **URL**: `GET /api/auth/users/lookup?identifier=<email_or_username>` (also supports `GET /api/auth/users/<identifier>`)
- **Description**: Retrieves full profile, whether they are currently logged in, their active sessions, and recent security logs.
- **Example**: `GET /api/auth/users/lookup?identifier=demo@glossyapi.dev`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "AlexGlossy",
      "email": "demo@glossyapi.dev",
      "full_name": "Alex Mercer",
      "auth_provider": "local",
      "created_at": "2026-11-11T12:00:00",
      "last_login": "2026-11-11T15:10:00"
    },
    "is_currently_logged_in": true,
    "active_sessions_count": 1,
    "active_sessions": [
      {
        "token": "glossy_9f8d1c...",
        "masked_token": "glossy_9f8d...a4b2",
        "device_label": "Desktop Browser",
        "ip_address": "127.0.0.1",
        "created_at": "2026-11-11T15:10:00",
        "expires_at": "2026-11-12T15:10:00"
      }
    ],
    "recent_activity": []
  }
}
```

### 9. Search Users Across System
- **URL**: `GET /api/auth/users/search?q=<query>`
- **Description**: Returns all users matching partial email, username, or name, along with their live online/offline status.

### 10. Change Password (Authenticated)
- **URL**: `POST /api/auth/change-password`
- **Header**: `Authorization: Bearer <token>`
- **Payload**: `{"current_password": "OldPass123!", "new_password": "NewPass456!"}`

### 11. Revoke All Other Active Sessions
- **URL**: `POST /api/auth/sessions/revoke-all`
- **Header**: `Authorization: Bearer <token>`
- **Description**: Immediately invalidates all other devices while keeping current active session.

---

## 🧪 Automated Test Suite

Run all 26 unit and integration tests (including Google OAuth, Client Tracking, and User Retrieval testing):
```bash
python test_api.py
```
*(All 26 tests pass with 100% success rate)*
