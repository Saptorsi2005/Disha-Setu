-- ============================================================
-- DishaSetu Database Migration: 003_update_room_types.sql
-- Add missing room types for medical/hospital facilities
-- ============================================================

-- Add new room types to the existing enum
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'pharmacy';
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'laboratory';
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'ward';
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'icu';
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'surgery';
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'radiology';
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'corridor';
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'room';

-- Note: PostgreSQL doesn't allow removing enum values easily
-- The existing values remain: entrance, exit, elevator, stairs, escalator,
-- office, department, classroom, lab, auditorium, restroom, cafeteria,
-- shop, atm, parking, emergency, medical, reception, waiting, other
