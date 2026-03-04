# DishaSetu Backend

Production-ready Node.js + Express + NeonDB backend for the DishaSetu civic-tech app.

---

## Quick Start

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and fill in your NeonDB URL, JWT secret, Cloudinary keys
```

### 3. Run database migration
> In your **NeonDB dashboard → SQL Editor**, paste and run the contents of `migrations/001_init.sql`
>
> Or run via CLI (requires DATABASE_URL in .env):
```bash
node migrations/run.js
```

### 4. Start the server
```bash
# Development (hot reload)
npm run dev

# Production
npm start
```

Server starts at **http://localhost:3000**  
Health check: **GET /health**

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/send-otp` | — | Send OTP to phone |
| POST | `/api/auth/verify-otp` | — | Verify OTP, get JWT |
| POST | `/api/auth/google` | — | Google sign-in |
| POST | `/api/auth/guest` | — | Guest session |
| POST | `/api/auth/push-token` | ✅ | Register Expo push token |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/projects?lat=&lng=` | Optional | All projects (distance-sorted if lat/lng given) |
| GET | `/api/projects/nearby?lat=&lng=&radius=` | Optional | Projects within radius (metres) |
| GET | `/api/projects/:id` | Optional | Project detail + milestones |
| POST | `/api/projects/location` | ✅ | Update user location (geo-fencing) |
| GET | `/api/projects/:id/updates` | Optional | Project update timeline |
| POST | `/api/projects/:id/updates` | ✅ | Post project update (triggers Socket.io) |
| POST | `/api/feedback` | Optional | Submit issue report |
| GET | `/api/feedback/user` | ✅ | User's submitted reports |
| GET | `/api/feedback/ticket/:ticketId` | Optional | Track ticket status |
| GET | `/api/notifications` | ✅ | User notification list |
| POST | `/api/notifications/read` | ✅ | Mark notifications read |
| GET | `/api/analytics/district` | — | District analytics (cached 24h) |

---

## Socket.io Events

Connect: `ws://localhost:3000` with `auth: { token: '<JWT>' }`

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe_project` | `projectId: string` | Join project update room |
| `unsubscribe_project` | `projectId: string` | Leave project room |
| `update_location` | `{ lat, lng }` | Update user location for geo-fencing |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `project_update` | `{ projectId, title, newStatus, ... }` | Project was updated |
| `new_notification` | `{ type, title, message, projectId }` | New personal notification |
| `geo_alert` | `{ projectId, projectName, distanceM }` | User is near a project |

---

## Database

**NeonDB** (Serverless PostgreSQL) with **PostGIS** extension.

Tables: `users`, `otps`, `push_tokens`, `departments`, `contractors`, `projects`, `milestones`, `project_updates`, `feedback_reports`, `notifications`, `user_activity`, `user_locations`, `analytics_cache`

Key PostGIS query pattern:
```sql
-- Projects within 5km sorted by distance
SELECT *, ST_Distance(location::geography, ST_MakePoint(lng, lat)::geography) AS distance_m
FROM projects
WHERE ST_DWithin(location::geography, ST_MakePoint(lng, lat)::geography, 5000)
ORDER BY distance_m ASC;
```

---

## Deployment

### Render.com (recommended)
1. Connect your GitHub repo to Render
2. Set environment variables in the Render dashboard (use `render.yaml` as reference)
3. Deploy — Render auto-detects `render.yaml`

### Vercel
```bash
npm i -g vercel
vercel --prod
```
> Note: Vercel serverless functions have a 10s timeout. For long-running jobs (geofence, analytics), prefer Render or Railway.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | NeonDB connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWTs |
| `CLOUDINARY_CLOUD_NAME` | For photo uploads | Cloudinary account |
| `CLOUDINARY_API_KEY` | For photo uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For photo uploads | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | For Google auth | OAuth Client ID |
| `CORS_ORIGINS` | Recommended | Comma-separated allowed origins |
| `PORT` | Optional | Default: 3000 |
| `NODE_ENV` | Optional | `development` \| `production` |

See `.env.example` for the full list.
