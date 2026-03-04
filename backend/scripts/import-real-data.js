/**
 * scripts/import-real-data.js
 * Import real government project data from CSV/JSON sources
 * 
 * USAGE:
 * 1. Download data from data.gov.in or other government portals
 * 2. Place CSV file in backend/data/projects.csv
 * 3. Run: node scripts/import-real-data.js
 * 
 * CSV Format Required:
 * name,category,department,contractor,budget,start_date,completion_date,status,progress,area,district,lat,lng,description,impact
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { query } = require('../src/config/db');

const CSV_FILE = path.join(__dirname, '../data/projects.csv');

// Category mapping (adjust based on your data source)
const CATEGORY_MAP = {
    'road': 'Road',
    'bridge': 'Bridge',
    'flyover': 'Bridge',
    'metro': 'Metro',
    'hospital': 'Hospital',
    'school': 'School',
    'college': 'College',
    'park': 'Park',
    'water': 'Water',
    'sewage': 'Sewage',
    'building': 'Building',
};

const STATUS_MAP = {
    'planned': 'Planned',
    'ongoing': 'In Progress',
    'in progress': 'In Progress',
    'completed': 'Completed',
    'delayed': 'Delayed',
};

async function importProjects() {
    console.log('🚀 Starting real government data import...\n');

    // Check if CSV file exists
    if (!fs.existsSync(CSV_FILE)) {
        console.error(`❌ CSV file not found: ${CSV_FILE}`);
        console.log('\n📋 Steps to get real data:');
        console.log('1. Visit https://data.gov.in');
        console.log('2. Search for "infrastructure projects" or "construction"');
        console.log('3. Download CSV');
        console.log('4. Place in backend/data/projects.csv');
        console.log('5. Run this script again\n');
        
        // Create sample template
        createSampleCSV();
        return;
    }

    try {
        // Read and parse CSV
        const fileContent = fs.readFileSync(CSV_FILE, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
        });

        console.log(`📁 Found ${records.length} records in CSV\n`);

        let imported = 0;
        let errors = 0;

        for (const record of records) {
            try {
                // Validate required fields
                if (!record.name || !record.lat || !record.lng) {
                    console.log(`⚠️  Skipping record: missing name or coordinates`);
                    errors++;
                    continue;
                }

                // Get or create department
                const deptName = record.department || 'Unknown Department';
                const deptResult = await query(
                    `INSERT INTO departments (name, code)
                     VALUES ($1, $2)
                     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                     RETURNING id`,
                    [deptName, deptName.replace(/\s+/g, '-').toUpperCase()]
                );
                const deptId = deptResult.rows[0].id;

                // Get or create contractor
                let contractorId = null;
                if (record.contractor) {
                    const contrResult = await query(
                        `INSERT INTO contractors (name)
                         VALUES ($1)
                         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                         RETURNING id`,
                        [record.contractor]
                    );
                    contractorId = contrResult.rows[0].id;
                }

                // Map category and status
                const category = CATEGORY_MAP[record.category?.toLowerCase()] || 'Other';
                const status = STATUS_MAP[record.status?.toLowerCase()] || 'Planned';
                
                // Parse budget
                const budget = parseFloat(record.budget?.replace(/[^0-9.]/g, '')) || null;
                const budgetDisplay = record.budget || null;

                // Insert project
                await query(
                    `INSERT INTO projects (
                        name, category, department_id, contractor_id,
                        budget, budget_display, start_date, expected_completion,
                        status, progress_percentage, area, district,
                        location, civic_impact, description
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                        ST_MakePoint($13, $14)::geography, $15, $16
                    )`,
                    [
                        record.name,
                        category,
                        deptId,
                        contractorId,
                        budget,
                        budgetDisplay,
                        record.start_date || null,
                        record.completion_date || null,
                        status,
                        parseInt(record.progress) || 0,
                        record.area || null,
                        record.district || null,
                        parseFloat(record.lng),  // longitude first for PostGIS
                        parseFloat(record.lat),  // latitude second
                        record.impact || null,
                        record.description || null,
                    ]
                );

                console.log(`✅ Imported: ${record.name} (${category})`);
                imported++;
            } catch (err) {
                console.error(`❌ Error importing "${record.name}": ${err.message}`);
                errors++;
            }
        }

        console.log(`\n✨ Import complete!`);
        console.log(`✅ Imported: ${imported} projects`);
        console.log(`❌ Errors: ${errors} projects\n`);
    } catch (err) {
        console.error('❌ Import failed:', err.message);
        process.exit(1);
    }

    process.exit(0);
}

function createSampleCSV() {
    const sampleData = `name,category,department,contractor,budget,start_date,completion_date,status,progress,area,district,lat,lng,description,impact
"Road Widening Project","road","PWD","XYZ Construction","50000000","2024-01-01","2025-12-31","in progress","45","Indiranagar","Bangalore East","12.9716","77.6412","Widening 5km stretch","Reduced traffic by 20%"
"Metro Line Extension","metro","BMRCL","ABC Infrastructure","2000000000","2023-06-01","2027-03-31","in progress","30","Whitefield","Bangalore East","12.9698","77.7499","New metro line","1 lakh daily riders"`;

    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const sampleFile = path.join(dataDir, 'sample-template.csv');
    fs.writeFileSync(sampleFile, sampleData);
    console.log(`\n✅ Created sample template: ${sampleFile}`);
    console.log('📝 Edit this file or replace with real government data\n');
}

// Run import
importProjects();
