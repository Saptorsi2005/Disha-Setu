-- ============================================================
-- DishaSetu Database Migration: 003_add_admin_role.sql
-- Add admin role support to users table
-- Run this after 002_indoor_navigation.sql
-- ============================================================

-- Add role column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Add check constraint to only allow valid roles
ALTER TABLE users
ADD CONSTRAINT check_user_role 
CHECK (role IN ('user', 'admin'));

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Optional: Promote first user to admin for testing
-- UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users ORDER BY created_at LIMIT 1);

COMMENT ON COLUMN users.role IS 'User role: user (default) or admin';
