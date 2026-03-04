/**
 * migrations/run.js
 * Run all SQL migrations against NeonDB
 * Usage: node migrations/run.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    const client = await pool.connect();
    try {
        console.log('🚀 Running migrations...');
        const sql = fs.readFileSync(path.join(__dirname, '001_init.sql'), 'utf8');
        await client.query(sql);
        console.log('✅ Migration 001_init.sql complete');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
