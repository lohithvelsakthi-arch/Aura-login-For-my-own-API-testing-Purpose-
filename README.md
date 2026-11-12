# AURA 2.0 // Luxury Glassmorphism Auth API & Portal

A high-performance, classy, and glossy authentication application and REST API built with **Node.js, Express, React 18, and Vite** — featuring real Google OAuth 2.0 Sign-In / Sign-Up, Active Client Tracking, User Lookup, and Celebratory Post-Authentication screens.

---

## ✨ Key Features

### 🌐 Real Working Google Sign-In & Sign-Up
- **1-Click Google Sign-Up**: Available on both the Sign In and Register views.
- **Glassmorphic Google Account Chooser**: Choose between pre-configured Google profiles (e.g. Alex Mercer, Sarah Connor) or click *"Use another Google account"* to test any Google email address.
- **OAuth 2.0 Backend**: Endpoint `POST /api/auth/oauth/google` automatically provisions new accounts, persists Google IDs and avatar URLs, issues secure session tokens, and returns a verified Google identity.
- **Google Identity Services (GIS) Ready**: Works out of the box with the interactive chooser, and supports setting your custom Google Cloud Client ID via the in-app settings modal.

### 🎉 Celebratory Post-Authentication Screens
- **Animated Tick Sign with Liquid Pulse Rings**: Smooth SVG animated checkmark and glowing rings upon successful sign-in or registration.
- **Existing Users**: Displays **"Welcome Back"** with session details and quick-action shortcuts.
- **New Users**: Displays **"Account Created Successfully"** with new identity details.

### 👥 System-Wide Active Clients Tracker (`GET /api/auth/clients`)
- Real-time registry of all active logged-in client sessions across the API.
- Tracks device labels (Mobile, Desktop), IP addresses, connection timestamps, expiration, and masked tokens.
- Includes 1-click token copy and 1-click user inspection.

### 🔍 User Search & Retrieval (`GET /api/auth/users/lookup`)
- Instant search and retrieval of any user account by email address or username.
- Inspects real-time online status (`LOGGED IN (N)` or `OFFLINE`), registration dates, database IDs, active sessions, and security audit logs.

### 💎 Luxury Frosted Glassmorphism 2.0 Aesthetic
- **Multi-layered Backdrop Blur**: `backdrop-filter: blur(30px) saturate(190%)` with specular highlights and luminous gemstone glows.
- **4 Dynamic Gemstone Accent Themes**:
  - 🔮 **Sapphire Indigo** (Default)
  - 🌿 **Emerald Mint**
  - 🌅 **Sunset Rose**
  - ⚡ **Electric Amber**
- **Ambient Constellation Canvas**: Glowing particles drifting and connecting with delicate light filaments.
- **Interactive Button Effects**: Mouse-coordinate spotlight cursor flare, specular reflection wave, and liquid ripple physics.
- **Synthesized Web Audio Feedback**: Crisp mechanical clicks, glass chimes, and soft buzzes generated in real-time via Web Audio API.

### 🛠️ Interactive Developer Suite
- **Built-in Live API Console**: Test all 14 endpoints directly inside the UI.
- **JSON Payload Editor**: Real-time syntax formatter.
- **Live Response Metrics**: Status badges with latency counters in milliseconds.
- **1-Click Copy as cURL**: Ready-to-paste CLI snippets.

---

## 📂 Project Architecture

```
MY API/
├── Frontend/                   # React 18 + Vite Frontend
│   ├── src/
│   │   ├── components/         # Modular glassmorphism UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Canvas.jsx
│   │   │   ├── SignIn.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Celebration.jsx
│   │   │   ├── ClientsTab.jsx
│   │   │   ├── ApiConsole.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── GoogleModal.jsx
│   │   │   ├── GoogleConfigModal.jsx
│   │   │   └── ForgotModal.jsx
│   │   ├── utils/
│   │   │   └── audio.js        # Web Audio API sound synthesizer
│   │   ├── App.jsx             # Root React component & state management
│   │   ├── index.css           # Frosted Glassmorphism 2.0 stylesheet
│   │   └── main.jsx
│   ├── vite.config.js          # Vite config with API reverse-proxy
│   └── package.json
│
├── server/                     # Node.js Express REST API Backend
│   ├── database.js             # Native node:sqlite (WAL mode, scrypt hashing)
│   ├── app.js                  # Express REST API & SPA static server
│   └── package.json
│
├── test_in_memory.js           # Automated integration test suite (27 checks)
├── package.json                # Root scripts (start, dev, build, test)
└── run.bat                     # 1-Click launcher for Windows
```

---

## 🚀 Quick Start

### Option 1: 1-Click Launcher (Windows)
Double-click `run.bat` in File Explorer. It will start the server and automatically open the application at:
👉 **[http://localhost:5000](http://localhost:5000)**

### Option 2: Terminal / npm
```bash
# Start production server
npm start

# Or run automated tests
npm test

# Or build client assets
npm run build
```

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/oauth/google` | Google OAuth Sign-In & Sign-Up | No |
| `GET` | `/api/auth/oauth/google/config` | Get Google Client ID | No |
| `POST` | `/api/auth/oauth/google/config` | Update Google Client ID | No |
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate with username/email & password | No |
| `GET` | `/api/auth/clients` | List all active logged-in client sessions | No |
| `GET` | `/api/auth/users/lookup` | Lookup user profile & session status | No |
| `GET` | `/api/auth/users/search` | Search users by partial name/email | No |
| `GET` | `/api/auth/users/:identifier` | Direct user retrieval by path | No |
| `GET` | `/api/auth/me` | Get current authenticated user profile | Yes (Bearer) |
| `PUT` | `/api/auth/profile` | Update user profile details | Yes (Bearer) |
| `POST` | `/api/auth/change-password` | Change password | Yes (Bearer) |
| `POST` | `/api/auth/refresh` | Rotate and extend session token | Yes (Bearer) |
| `GET` | `/api/auth/sessions` | List active sessions for user | Yes (Bearer) |
| `POST` | `/api/auth/sessions/revoke-all` | Revoke other active sessions | Yes (Bearer) |
| `GET` | `/api/auth/audit-logs` | Retrieve security audit events | Yes (Bearer) |
| `POST` | `/api/auth/forgot-password` | Generate 6-digit verification code | No |
| `POST` | `/api/auth/reset-password` | Reset password using 6-digit code | No |
| `POST` | `/api/auth/logout` | Terminate session token | Yes (Bearer) |
| `GET` | `/api/auth/health` | Health metrics & SQLite stats | No |
| `GET` | `/api/auth/spec` | Full OpenAPI-style endpoint schema | No |
