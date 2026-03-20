require('dotenv').config();
const { query } = require('./src/config/db');

async function migrate() {
    try {
        console.log('Creating room_insights table...');
        await query(`
            CREATE TABLE IF NOT EXISTS room_insights (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table created successfully.');

        // Seed data for the Rajajinagar Hospital project
        // Building ID: 5beb7c0e-8790-4a25-af14-cc8f90d7323b
        // Need to get some room IDs from this building
        const roomsRes = await query(`
            SELECT r.id, r.name FROM rooms r
            JOIN floors f ON r.floor_id = f.id
            WHERE f.building_id = $1
        `, ['5beb7c0e-8790-4a25-af14-cc8f90d7323b']);

        const rooms = roomsRes.rows;
        console.log(`Found ${rooms.length} rooms in building.`);

        const insights = [
            { name: 'ICU - Intensive Care Unit', title: '₹20 Cr Upgrade', description: 'This ICU was upgraded with state-of-the-art life support systems in 2025.', type: 'impact' },
            { name: 'Pharmacy', title: '24/7 Availability', description: 'This pharmacy stocks over 5,000 essential life-saving drugs available 24/7.', type: 'info' },
            { name: 'Waiting Area', title: 'Patient Comfort', description: 'Equipped with digital token system to reduce waiting time by 40%.', type: 'impact' },
            { name: 'Emergency Department', title: 'Rapid Response', description: 'Trauma center with 5-minute response time for critical arrivals.', type: 'alert' }
        ];

        for (const ins of insights) {
            const room = rooms.find(r => r.name.toLowerCase().includes(ins.name.toLowerCase()));
            if (room) {
                console.log(`Seeding insight for ${room.name}...`);
                await query(`
                    INSERT INTO room_insights (room_id, title, description, type)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                `, [room.id, ins.title, ins.description, ins.type]);
            }
        }

        console.log('Migration and seeding complete.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
    process.exit(0);
}

migrate();
