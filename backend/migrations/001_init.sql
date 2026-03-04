-- ============================================================
-- DishaSetu Database Migration: 001_init.sql
-- Run this against your NeonDB instance
-- Requires: PostGIS extension
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE project_status AS ENUM ('Planned', 'In Progress', 'Completed', 'Delayed');
CREATE TYPE notification_type AS ENUM ('new_project', 'status_change', 'completed', 'delay', 'geo_fence_alert');
CREATE TYPE feedback_status AS ENUM ('Pending', 'Under Review', 'Resolved', 'Rejected');
CREATE TYPE feedback_category AS ENUM ('delay', 'safety', 'noise', 'traffic', 'corruption', 'other');
CREATE TYPE activity_type AS ENUM ('feedback', 'saved', 'viewed', 'report');

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(15) UNIQUE,
    google_id       VARCHAR(255) UNIQUE,
    name            VARCHAR(255),
    avatar_url      TEXT,
    is_guest        BOOLEAN DEFAULT FALSE,
    civic_level     VARCHAR(50) DEFAULT 'Civic Newcomer',
    civic_points    INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- OTPs (temporary, TTL 10 min)
CREATE TABLE otps (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone       VARCHAR(15) NOT NULL,
    code        VARCHAR(6) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Push tokens for Expo notifications
CREATE TABLE push_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL,
    platform    VARCHAR(10),    -- 'ios' | 'android' | 'web'
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, token)
);

-- ============================================================
-- DEPARTMENTS & CONTRACTORS (lookup tables)
-- ============================================================

CREATE TABLE departments (
    id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name    VARCHAR(255) UNIQUE NOT NULL,
    code    VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE contractors (
    id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name    VARCHAR(255) UNIQUE NOT NULL,
    contact VARCHAR(255)
);

-- ============================================================
-- PROJECTS (with PostGIS geography)
-- ============================================================

CREATE TABLE projects (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                 VARCHAR(500) NOT NULL,
    description          TEXT,
    category             VARCHAR(100) NOT NULL,
    department_id        UUID REFERENCES departments(id),
    contractor_id        UUID REFERENCES contractors(id),
    budget               NUMERIC(15, 2),
    budget_display       VARCHAR(50),          -- e.g. "₹120 Cr"
    start_date           DATE,
    expected_completion  DATE,
    completion_display   VARCHAR(50),          -- e.g. "Dec 2025"
    status               project_status DEFAULT 'Planned',
    progress_percentage  INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    area                 VARCHAR(255),
    district             VARCHAR(255),
    image_url            TEXT,
    -- PostGIS geography column: POINT(lng lat)
    location             geography(Point, 4326),
    geofence_radius      INTEGER DEFAULT 500,   -- metres
    civic_impact         TEXT,
    beneficiaries        VARCHAR(255),
    impact_stat          VARCHAR(255),
    delay_reason         TEXT,
    last_updated         TIMESTAMPTZ DEFAULT NOW(),
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Fast geospatial index
CREATE INDEX idx_projects_location ON projects USING GIST(location);
CREATE INDEX idx_projects_status   ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);

-- ============================================================
-- MILESTONES
-- ============================================================

CREATE TABLE milestones (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    completed   BOOLEAN DEFAULT FALSE,
    target_date VARCHAR(50),          -- e.g. "Mar 2025"
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_project ON milestones(project_id);

-- ============================================================
-- PROJECT UPDATES (timeline feed)
-- ============================================================

CREATE TABLE project_updates (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
    author_id   UUID REFERENCES users(id),
    title       VARCHAR(500) NOT NULL,
    body        TEXT,
    update_type VARCHAR(100),   -- 'status_change' | 'milestone' | 'general'
    old_status  project_status,
    new_status  project_status,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_updates_project ON project_updates(project_id);
CREATE INDEX idx_project_updates_created ON project_updates(created_at DESC);

-- ============================================================
-- FEEDBACK REPORTS
-- ============================================================

CREATE TABLE feedback_reports (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id   VARCHAR(20) UNIQUE NOT NULL, -- GF-YYYY-XXXX
    user_id     UUID REFERENCES users(id),
    project_id  UUID REFERENCES projects(id),
    category    feedback_category NOT NULL,
    description TEXT NOT NULL,
    photo_url   TEXT,
    status      feedback_status DEFAULT 'Pending',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_user    ON feedback_reports(user_id);
CREATE INDEX idx_feedback_project ON feedback_reports(project_id);
CREATE INDEX idx_feedback_status  ON feedback_reports(status);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id   UUID REFERENCES projects(id),
    type         notification_type NOT NULL,
    title        VARCHAR(500) NOT NULL,
    message      TEXT NOT NULL,
    is_read      BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user    ON notifications(user_id);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread  ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- USER ACTIVITY
-- ============================================================

CREATE TABLE user_activity (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id  UUID REFERENCES projects(id),
    type        activity_type NOT NULL,
    metadata    JSONB,          -- ticket_id, etc.
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user    ON user_activity(user_id);
CREATE INDEX idx_user_activity_created ON user_activity(created_at DESC);

-- ============================================================
-- USER SAVED LOCATIONS (for geo-fence job)
-- ============================================================

CREATE TABLE user_locations (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    location    geography(Point, 4326),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_locations ON user_locations USING GIST(location);

-- ============================================================
-- ANALYTICS CACHE (pre-computed daily)
-- ============================================================

CREATE TABLE analytics_cache (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district     VARCHAR(255) DEFAULT 'All',
    data         JSONB NOT NULL,
    computed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA: Departments & Contractors
-- ============================================================

INSERT INTO departments (name, code) VALUES
    ('BBMP - Roads Division', 'BBMP-RD'),
    ('BBMP Health Division', 'BBMP-HD'),
    ('BMRCL', 'BMRCL'),
    ('NHAI', 'NHAI'),
    ('Dept. of Higher Education', 'DHE');

INSERT INTO contractors (name) VALUES
    ('L&T Infrastructure Ltd.'),
    ('Afcons Infrastructure'),
    ('Shapoorji Pallonji'),
    ('KMC Constructions'),
    ('Prestige Constructions');

-- ============================================================
-- SEED DATA: Projects (matches frontend mock data)
-- ============================================================

WITH dept AS (SELECT id, code FROM departments),
     cont AS (SELECT id, name FROM contractors)
INSERT INTO projects (
    id, name, category, department_id, contractor_id,
    budget, budget_display, start_date, expected_completion, completion_display,
    status, progress_percentage, area, district,
    image_url, location, geofence_radius,
    civic_impact, beneficiaries, impact_stat
) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'Hebbal Flyover Expansion',
    'Bridge',
    (SELECT id FROM dept WHERE code='BBMP-RD'),
    (SELECT id FROM cont WHERE name='L&T Infrastructure Ltd.'),
    12000000000, '₹120 Cr',
    '2024-01-01', '2025-12-31', 'Dec 2025',
    'In Progress', 62, 'Hebbal', 'Bangalore North',
    'https://images.unsplash.com/photo-1541888086925-920a061d4bb6?w=800&q=80',
    ST_MakePoint(77.5970, 13.0358)::geography, 600,
    'This flyover will reduce traffic congestion by 35% in the Hebbal junction, benefiting over 80,000 daily commuters.',
    '80,000+ daily commuters', '35% congestion reduction'
),
(
    '00000000-0000-0000-0000-000000000002',
    'Kempegowda Layout Metro Extension',
    'Metro',
    (SELECT id FROM dept WHERE code='BMRCL'),
    (SELECT id FROM cont WHERE name='Afcons Infrastructure'),
    84000000000, '₹840 Cr',
    '2023-06-01', '2026-03-31', 'Mar 2026',
    'In Progress', 45, 'Kempegowda Layout', 'Bangalore West',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    ST_MakePoint(77.5946, 12.9716)::geography, 800,
    'Metro extension will connect 5 key localities, reducing road traffic by an estimated 25% and serving 120,000 daily riders.',
    '1.2 lakh daily riders', '25% road traffic reduction'
),
(
    '00000000-0000-0000-0000-000000000003',
    'Rajajinagar General Hospital Upgrade',
    'Hospital',
    (SELECT id FROM dept WHERE code='BBMP-HD'),
    (SELECT id FROM cont WHERE name='Shapoorji Pallonji'),
    4500000000, '₹45 Cr',
    '2023-04-01', '2025-06-30', 'Jun 2025',
    'Delayed', 30, 'Rajajinagar', 'Bangalore West',
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
    ST_MakePoint(77.5530, 12.9915)::geography, 400,
    'New 200-bed facility with ICU and trauma center will serve 3 lakh residents of West Bangalore.',
    '3 lakh residents', '200 new hospital beds'
),
(
    '00000000-0000-0000-0000-000000000004',
    'Outer Ring Road Surface Repair',
    'Road',
    (SELECT id FROM dept WHERE code='NHAI'),
    (SELECT id FROM cont WHERE name='KMC Constructions'),
    1800000000, '₹18 Cr',
    '2023-11-01', '2024-02-29', 'Feb 2024',
    'Completed', 100, 'Marathahalli', 'Bangalore East',
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&q=80',
    ST_MakePoint(77.6974, 12.9591)::geography, 300,
    '12 km of road repaired with smart surface, reducing pothole-related accidents by 60%.',
    '2 lakh vehicles/day', '60% accident reduction'
),
(
    '00000000-0000-0000-0000-000000000005',
    'Visvesvaraya Tech College New Block',
    'College',
    (SELECT id FROM dept WHERE code='DHE'),
    (SELECT id FROM cont WHERE name='Prestige Constructions'),
    3200000000, '₹32 Cr',
    '2024-08-01', '2026-04-30', 'Apr 2026',
    'In Progress', 18, 'Yelahanka', 'Bangalore North',
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80',
    ST_MakePoint(77.5963, 13.1007)::geography, 300,
    'New academic block with 40 classrooms, 10 labs and 500-seat auditorium. Will benefit 3000+ students.',
    '3,000+ students', '40 new classrooms'
);

-- ============================================================
-- SEED DATA: Milestones
-- ============================================================

INSERT INTO milestones (project_id, title, completed, target_date, sort_order) VALUES
-- Project 1: Hebbal Flyover
('00000000-0000-0000-0000-000000000001', 'Foundation Complete', TRUE, 'Mar 2024', 1),
('00000000-0000-0000-0000-000000000001', 'Structural Work', TRUE, 'Aug 2024', 2),
('00000000-0000-0000-0000-000000000001', 'Deck Slabs', FALSE, 'Mar 2025', 3),
('00000000-0000-0000-0000-000000000001', 'Road Markings & Safety', FALSE, 'Oct 2025', 4),
('00000000-0000-0000-0000-000000000001', 'Inauguration', FALSE, 'Dec 2025', 5),
-- Project 2: Metro
('00000000-0000-0000-0000-000000000002', 'Land Acquisition', TRUE, 'Dec 2023', 1),
('00000000-0000-0000-0000-000000000002', 'Tunneling Phase 1', TRUE, 'Jun 2024', 2),
('00000000-0000-0000-0000-000000000002', 'Tunneling Phase 2', FALSE, 'Dec 2024', 3),
('00000000-0000-0000-0000-000000000002', 'Station Construction', FALSE, 'Sep 2025', 4),
('00000000-0000-0000-0000-000000000002', 'Trial Run', FALSE, 'Jan 2026', 5),
('00000000-0000-0000-0000-000000000002', 'Commercial Launch', FALSE, 'Mar 2026', 6),
-- Project 3: Hospital
('00000000-0000-0000-0000-000000000003', 'Demolition of Old Wing', TRUE, 'Jul 2023', 1),
('00000000-0000-0000-0000-000000000003', 'Foundation & Basement', TRUE, 'Dec 2023', 2),
('00000000-0000-0000-0000-000000000003', 'Superstructure (Floors 1-3)', FALSE, 'Aug 2024', 3),
('00000000-0000-0000-0000-000000000003', 'MEP Works', FALSE, 'Feb 2025', 4),
('00000000-0000-0000-0000-000000000003', 'Medical Equipment Install', FALSE, 'May 2025', 5),
-- Project 4: ORR (all completed)
('00000000-0000-0000-0000-000000000004', 'Survey & Planning', TRUE, 'Nov 2023', 1),
('00000000-0000-0000-0000-000000000004', 'Old Surface Removal', TRUE, 'Dec 2023', 2),
('00000000-0000-0000-0000-000000000004', 'New Asphalt Laying', TRUE, 'Jan 2024', 3),
('00000000-0000-0000-0000-000000000004', 'Road Markings', TRUE, 'Feb 2024', 4),
('00000000-0000-0000-0000-000000000004', 'Handover', TRUE, 'Feb 2024', 5),
-- Project 5: College
('00000000-0000-0000-0000-000000000005', 'Foundation Work', TRUE, 'Oct 2024', 1),
('00000000-0000-0000-0000-000000000005', 'Ground Floor Frame', FALSE, 'Mar 2025', 2),
('00000000-0000-0000-0000-000000000005', 'Upper Floors', FALSE, 'Nov 2025', 3),
('00000000-0000-0000-0000-000000000005', 'Interior & Labs', FALSE, 'Feb 2026', 4),
('00000000-0000-0000-0000-000000000005', 'Inauguration', FALSE, 'Apr 2026', 5);
