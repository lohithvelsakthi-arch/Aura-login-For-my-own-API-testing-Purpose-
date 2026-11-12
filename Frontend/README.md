# AURA 2.0 • Frontend Client

A high-performance, luxury Frosted Glassmorphism 2.0 user interface built with **React 18** and **Vite**, featuring ambient canvas animations, synthesized Web Audio feedback, interactive button physics, and real Google OAuth 2.0 integration.

---

## 📦 Frontend Requirements & Dependencies

### Runtime Dependencies
- **`react`** (`^18.3.1`): Declarative component-based UI framework.
- **`react-dom`** (`^18.3.1`): DOM rendering engine for React.

### Developer Dependencies
- **`vite`** (`^6.0.7`): High-speed bundler and local development server with HMR.
- **`@vitejs/plugin-react`** (`^4.3.4`): Fast Refresh and Babel/JSX compilation plugin.

### System Requirements
- **Node.js**: v18.0.0 or later (Tested on Node.js v22 LTS).
- **npm**: v9.0.0 or later (Tested on npm 10.9).

---

## 📂 Frontend Directory Structure

```
Frontend/
├── dist/                          # Production-optimized distribution bundle
│   ├── assets/
│   │   ├── index-BCQ-Tvsh.css     # Production compressed stylesheet (31.5 kB)
│   │   └── index-Dy0i5PgU.js      # Production bundled JavaScript (210.5 kB)
│   └── index.html
│
├── src/
│   ├── components/                # Modular React glassmorphic UI components
│   │   ├── ApiConsole.jsx         # Live interactive API test console with cURL export
│   │   ├── Canvas.jsx             # Ambient constellation particle background canvas
│   │   ├── Celebration.jsx        # Post-auth celebration screen with animated tick sign
│   │   ├── ClientsTab.jsx         # System-wide active logged-in clients tracker & lookup
│   │   ├── ForgotModal.jsx        # 6-digit OTP verification code password reset modal
│   │   ├── GoogleConfigModal.jsx  # Google Cloud OAuth Client ID configuration modal
│   │   ├── GoogleModal.jsx        # Google account chooser modal & custom profile testing
│   │   ├── Navbar.jsx             # Top bar, theme accent switcher, audio toggle & nav pills
│   │   ├── Profile.jsx            # Authenticated user dashboard, token refresh & sessions
│   │   ├── Register.jsx           # Sign-up form with live password strength meter
│   │   └── SignIn.jsx             # Login form, 1-click demo fill & Google sign-in triggers
│   │
│   ├── utils/
│   │   └── audio.js               # Web Audio API real-time sound synthesizer (clicks, chimes)
│   │
│   ├── App.jsx                    # Root component, global state, session persistence & toasts
│   ├── index.css                  # Luxury Frosted Glassmorphism 2.0 stylesheet (41 kB)
│   └── main.jsx                   # React application entry point
│
├── index.html                     # HTML root template with Google Identity Services (GIS)
├── vite.config.js                 # Vite configuration with `/api` reverse-proxy to port 5000
└── package.json                   # Frontend package manifest & scripts
```

---

## 🚀 Available Scripts

From the root project directory:
```bash
# Build frontend for production
npm run build

# Start live frontend development server on http://localhost:5173
npm run dev:client
```

Or directly inside `Frontend/`:
```bash
cd Frontend
npm run build
npm run dev
```

---

## 🎨 UI & Aesthetics Specification

- **Glassmorphism 2.0**: Multi-layered backdrop blur (`blur(30px) saturate(190%)`) with frosted specular highlights.
- **Dynamic Themes**: 4 Gemstone accents (`sapphire`, `emerald`, `rose`, `amber`).
- **Interactive Physics**: Mouse-tracking coordinate spotlight flare, liquid click ripples, and diagonal high-gloss shimmer waves.
- **Synthesized Audio**: Web Audio API oscillator synthesis for tactile mechanical clicks and celebratory dual-harmonic glass chimes.
