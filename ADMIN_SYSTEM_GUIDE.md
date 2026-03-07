# 🔐 Admin System Guide

## Overview

The **Admin Dashboard** provides administrative control over the DishaSetu platform, including:
- Feedback/complaint management
- Analytics and insights
- Indoor navigation data management
- User activity monitoring

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

The admin system requires adding a `role` column to the `users` table.

```bash
cd backend

# Run the migration
node migrations/run.js
```

OR run the migration manually:

```bash
psql $DATABASE_URL -f migrations/003_add_admin_role.sql
```

### Step 2: Create Admin User

Use the setup script to promote a user to admin:

```bash
# Option 1: Promote first user in database
node scripts/setup-admin.js

# Option 2: Promote specific user by phone
node scripts/setup-admin.js --phone=9876543210

# Option 3: Promote specific user by Google ID
node scripts/setup-admin.js --google-id=your-google-id-here
```

### Step 3: Manual Admin Promotion (Alternative)

You can also manually promote users via SQL:

```sql
-- Promote by phone number
UPDATE users SET role = 'admin' WHERE phone = '9876543210';

-- Promote by email/Google ID
UPDATE users SET role = 'admin' WHERE google_id = 'your-google-id';

-- Check admin users
SELECT id, name, phone, role FROM users WHERE role = 'admin';
```

---

## 📱 Accessing Admin Dashboard

1. **Login** to the app with your admin account (phone OTP or Google)
2. Navigate to **Settings** tab
3. You'll see an **"Administration"** section (only visible to admins)
4. Click **"Admin Dashboard"** to access admin features

---

## 🎯 Admin Features

### 1. Dashboard Overview
- Total feedback count
- Total projects
- Total buildings mapped
- Total navigation nodes
- Recent activity feed

**Route:** `/admin`

### 2. Feedback Management
- View all user feedback/complaints
- Filter by status and category
- Update feedback status (Pending → Under Review → Resolved/Rejected)
- Delete inappropriate feedback

**Route:** `/admin/feedback`

**API Endpoints:**
```javascript
GET  /api/admin/feedback           // List all feedback
GET  /api/admin/feedback?status=Pending&category=delay
PATCH /api/admin/feedback/:id/status  // Update status
DELETE /api/admin/feedback/:id     // Delete feedback
```

### 3. Complaint Analytics
- Most reported locations
- Most frequent complaint categories
- Complaint trends (last 30 days)
- Status distribution

**Route:** `/admin/analytics`

**API Endpoint:**
```javascript
GET /api/admin/analytics/feedback
```

### 4. Indoor Navigation Management
- View all buildings, floors, rooms
- View connections (graph edges)
- Delete rooms (with cascading deletion of connections)
- Delete connections
- Filter by building

**Route:** `/admin/navigation`

**API Endpoints:**
```javascript
GET    /api/admin/navigation/data           // All rooms & connections
GET    /api/admin/navigation/data?building_id=xxx
POST   /api/admin/navigation/rooms          // Add room
PATCH  /api/admin/navigation/rooms/:id      // Update room
DELETE /api/admin/navigation/rooms/:id      // Delete room
POST   /api/admin/navigation/connections    // Add connection
DELETE /api/admin/navigation/connections/:id
POST   /api/admin/navigation/buildings      // Add building
POST   /api/admin/navigation/floors         // Add floor
```

---

## 🔒 Security

### Role-Based Access Control

- **Middleware:** `requireAdmin()` in `src/middleware/admin.middleware.js`
- All `/api/admin/*` routes are protected
- Non-admin users receive **403 Forbidden** error

### JWT Authentication

Admin routes require:
1. Valid JWT token in `Authorization: Bearer <token>` header
2. User must have `role = 'admin'` in database

### Frontend Protection

Admin dashboard screens check `user.role === 'admin'` and redirect non-admins to home.

---

## 📊 Database Schema

### Users Table Extension

```sql
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD CONSTRAINT check_user_role CHECK (role IN ('user', 'admin'));
CREATE INDEX idx_users_role ON users(role);
```

**Roles:**
- `user` (default) — Regular citizen users
- `admin` — Platform administrators

---

## 🛠️ API Reference

### Admin Authentication

All admin endpoints require:
```http
Authorization: Bearer <jwt-token>
```

The JWT must belong to a user with `role = 'admin'`.

### Dashboard Stats

```http
GET /api/admin/dashboard/stats
```

**Response:**
```json
{
  "stats": {
    "totalFeedback": 150,
    "totalBuildings": 5,
    "totalRooms": 320,
    "totalProjects": 78
  },
  "feedbackByStatus": [
    { "status": "Pending", "count": 45 },
    { "status": "Resolved", "count": 80 }
  ],
  "recentActivity": [...]
}
```

### Feedback Management

#### List All Feedback
```http
GET /api/admin/feedback?status=Pending&category=delay&limit=50&offset=0
```

#### Update Feedback Status
```http
PATCH /api/admin/feedback/:id/status
Content-Type: application/json

{
  "status": "Resolved"
}
```

Valid statuses: `Pending`, `Under Review`, `Resolved`, `Rejected`

#### Delete Feedback
```http
DELETE /api/admin/feedback/:id
```

### Indoor Navigation Management

#### Get Navigation Data
```http
GET /api/admin/navigation/data?building_id=<uuid>
```

**Response:**
```json
{
  "rooms": [...],
  "connections": [...]
}
```

#### Add Room
```http
POST /api/admin/navigation/rooms
Content-Type: application/json

{
  "floor_id": "uuid",
  "name": "Cardiology Department",
  "type": "office",
  "room_number": "101",
  "x_coordinate": 0.5,
  "y_coordinate": 0.3,
  "is_accessible": true,
  "keywords": ["cardio", "heart", "doctor"]
}
```

#### Add Connection
```http
POST /api/admin/navigation/connections
Content-Type: application/json

{
  "from_room": "room-uuid-1",
  "to_room": "room-uuid-2",
  "distance": 15.5,
  "is_bidirectional": true,
  "is_accessible": true
}
```

---

## 🧪 Testing

### Test Admin Access

1. Create test admin user:
```bash
node scripts/setup-admin.js --phone=1234567890
```

2. Login via app with that phone number
3. Navigate to Settings → Admin Dashboard
4. Verify access to all admin features

### Test Non-Admin Protection

1. Login with a regular user account
2. Settings should NOT show "Administration" section
3. Direct navigation to `/admin` should redirect to home

---

## 🚨 Troubleshooting

### "Admin access required" Error

**Cause:** User doesn't have admin role

**Solution:**
```sql
UPDATE users SET role = 'admin' WHERE phone = 'your-phone';
```

### Admin Dashboard Not Showing in Settings

**Cause:** Frontend not detecting admin role

**Solution:**
1. Check that `role` is returned in `/api/auth/me` response
2. Verify `user.role === 'admin'` in Settings screen
3. Clear app cache and re-login

### Migration Already Applied Error

This is normal if you run the migration twice. The script checks for column existence.

---

## 📝 Implementation Checklist

- [x] Database migration (add `role` column)
- [x] Admin middleware (`requireAdmin`)
- [x] Admin controller (feedback, analytics, navigation)
- [x] Admin routes (`/api/admin/*`)
- [x] Admin service (frontend API client)
- [x] Admin dashboard UI (4 screens)
- [x] Protected route handling
- [x] Settings screen integration
- [x] Setup script for admin creation

---

## 🔮 Future Enhancements

- [ ] User management (view all users, ban/unban)
- [ ] Project management (create, edit, delete projects)
- [ ] Email notifications for feedback updates
- [ ] Export analytics to CSV/PDF
- [ ] Audit logs for admin actions
- [ ] Multi-level admin roles (super admin, moderator)
- [ ] Floor plan image upload
- [ ] Bulk room/connection import from CSV

---

## 📞 Support

For issues or questions:
1. Check the [main README](../README.md)
2. Review [SYSTEM_ARCHITECTURE.md](../SYSTEM_ARCHITECTURE.md)
3. Contact the development team

---

**Version:** 1.0.0  
**Last Updated:** March 7, 2026
