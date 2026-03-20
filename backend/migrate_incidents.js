/**
 * migrate_incidents.js
 * Creates navigation_incidents table and seeds sample data.
 * Run: node migrate_incidents.js
 */
require('dotenv').config({ path: './src/.env' });
const { query } = require('./src/config/db');

async function migrate() {
    console.log('Creating navigation_incidents table...');

    await query(`
        CREATE TABLE IF NOT EXISTS navigation_incidents (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type        VARCHAR(30) NOT NULL CHECK (type IN ('lift_down', 'blocked_path', 'room_closed', 'maintenance')),
            room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
            connection_id UUID,
            message     TEXT NOT NULL,
            severity    VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
            is_active   BOOLEAN NOT NULL DEFAULT true,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);
    console.log('✅ navigation_incidents table created.');

    // Fetch an elevator room from Rajajinagar Hospital to seed an incident
    const elevatorRes = await query(`
        SELECT r.id FROM rooms r
        JOIN floors f ON r.floor_id = f.id
        JOIN buildings b ON f.building_id = b.id
        WHERE b.name ILIKE '%rajajinagar%' AND r.type = 'elevator'
        LIMIT 1
    `);

    if (elevatorRes.rows.length > 0) {
        const elevatorId = elevatorRes.rows[0].id;
        await query(`
            INSERT INTO navigation_incidents (type, room_id, message, severity, is_active)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT DO NOTHING
        `, ['lift_down', elevatorId, 'Elevator is temporarily out of service. Please use stairs.', 'high', true]);
        console.log('✅ Seeded lift_down incident for elevator room.');
    }

    // Seed a generic blocked path with no specific room
    await query(`
        INSERT INTO navigation_incidents (type, message, severity, is_active)
        VALUES ($1, $2, $3, $4)
    `, ['maintenance', 'Corridor on Ground Floor under maintenance. Expect delays.', 'medium', true]);
    console.log('✅ Seeded maintenance incident.');

    console.log('Migration complete.');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
