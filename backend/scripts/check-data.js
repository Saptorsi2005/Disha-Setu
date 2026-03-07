/**
 * scripts/check-data.js
 * Check what data exists in the database
 */
require('dotenv').config();
const { query } = require('../src/config/db');

async function checkData() {
    try {
        console.log('📊 Checking database data...\n');
        
        // Check projects
        const projects = await query('SELECT COUNT(*) FROM projects');
        console.log(`Projects: ${projects.rows[0].count}`);
        
        // Check feedback
        const feedback = await query('SELECT COUNT(*) FROM feedback_reports');
        console.log(`Feedback Reports: ${feedback.rows[0].count}`);
        
        // Check buildings
        const buildings = await query('SELECT COUNT(*) FROM buildings');
        console.log(`Buildings: ${buildings.rows[0].count}`);
        
        // Check rooms
        const rooms = await query('SELECT COUNT(*) FROM rooms');
        console.log(`Rooms: ${rooms.rows[0].count}`);
        
        // Check users
        const users = await query('SELECT COUNT(*), role FROM users GROUP BY role');
        console.log('\nUsers by role:');
        users.rows.forEach(row => {
            console.log(`  ${row.role}: ${row.count}`);
        });
        
        console.log('\n✅ Data check complete');
        process.exit(0);
    } catch (err) {
        console.error('Error checking data:', err);
        process.exit(1);
    }
}

checkData();
