# DishaSetu Production Deployment Guide

This document contains the exact configuration and steps to deploy the DishaSetu project to production successfully.

---

## 1. Backend (Render Deployment)
Deploying the backend on Render as a "Web Service".

### Configuration Blueprint
- **Environment**: Node
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`
- **Free/Starter tier**: Ensure it does not auto-sleep excessively if real-time features are heavily used.

### Required Environment Variables
Add these to the Render dashboard under your service settings:
| Variable | Value | Description |
|---|---|---|
| `PORT` | `3000` | Typically Render passes the PORT dynamically, keep it if requested |
| `DATABASE_URL` | `postgresql://...` | Secure connection string from Neon.Tech |
| `JWT_SECRET` | `your_secure_random_string` | Used to cryptographically secure tokens |
| `GOOGLE_CLIENT_ID` | `7151...` | Must match frontend OAuth client exact ID |
| `CLOUDINARY_CLOUD_NAME` | `...` | Cloudinary access from backend dashboard |
| `CLOUDINARY_API_KEY` | `...` | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | `...` | Cloudinary API Secret |
| `CORS_ORIGINS` | `https://dishasetu-frontend.onrender.com` | If you host the web frontend somewhere. (Comma separated allowed domains) |

---

## 2. Frontend (Expo EAS Build)
Building the Android APK bundle via Expo Application Services.

### Configuration Blueprint
1. Copy `frontend/.env.example` to `frontend/.env` locally (do NOT commit secrets).
2. Inside `frontend/.env`, set the dynamic `EXPO_PUBLIC_` variables:

```bash
# Point to your NEW Render Backend URL
EXPO_PUBLIC_API_URL=https://your-dishasetu-service.onrender.com/api
# The matching Google OAuth ID
EXPO_PUBLIC_GOOGLE_CLIENT_ID=821266969114-kihsrvi0uehnfv265ij0c02av1bl4b5l.apps.googleusercontent.com
```

### Build Command
Run this inside the `frontend` directory:
```bash
eas build -p android --profile production
```
*(Ensure you have logged into EAS CLI using `eas login` prior to this step).*

### Why does this work?
- EAS automatically injects variables prefixed with `EXPO_PUBLIC_` into the compiled JS bundle.
- Hardcoded localhost IP addresses have been completely removed from `services/api.js` and `config/platform.js`.
- The frontend will robustly default to `EXPO_PUBLIC_API_URL` without falling back to local IPs and Metro debug ports.

---

## 3. Final Production Readiness Checklist

- [x] **No `localhost` or dev IP hooks:** Fallbacks disabled; app properly uses production URLs.
- [x] **Secure Auth Client Ids:** Environment-injected dynamically to `AuthContext`/`authService`.
- [x] **Safe Cloudinary Access:** Keys live ONLY on Node/Render backend.
- [x] **Socket CORS Hardened:** Restricted to matching frontend requests via array parsing.
- [x] **API Rate Limiting & Helmet Security:** Validated active in `app.js`.

**Phase 9 (Validation):**
Deploy your Render app first -> copy the generated Render URL into the `frontend/.env` file under `EXPO_PUBLIC_API_URL` -> then trigger the EAS build -> test on a physical Android device.
