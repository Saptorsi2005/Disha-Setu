/**
 * scripts/verify-project.js
 * Quick verification tool to check if GPS coordinates point to real construction sites
 * Uses Google Maps geocoding to verify location makes sense
 */

require('dotenv').config();
const https = require('https');
const { query } = require('../src/config/db');

// Get all projects from database
async function verifyAllProjects() {
    console.log('🔍 Verifying projects in database...\n');

    const result = await query(`
        SELECT 
            id,
            name,
            category,
            area,
            ST_Y(location::geometry) AS lat,
            ST_X(location::geometry) AS lng
        FROM projects
        ORDER BY name
    `);

    const projects = result.rows;

    console.log(`Found ${projects.length} projects\n`);
    console.log('=' .repeat(80));

    for (const project of projects) {
        console.log(`\n📍 ${project.name}`);
        console.log(`   Category: ${project.category} | Area: ${project.area}`);
        console.log(`   GPS: ${project.lat}, ${project.lng}`);
        console.log(`   Google Maps: https://www.google.com/maps?q=${project.lat},${project.lng}`);
        console.log(`   Verify: Open link and check if construction site exists`);
        console.log('-'.repeat(80));
    }

    console.log('\n\n✅ Verification Steps:');
    console.log('1. Open each Google Maps link above');
    console.log('2. Check if you see a construction site at that location');
    console.log('3. Search project name on:');
    console.log('   - https://bbmp.gov.in');
    console.log('   - https://english.bmrc.co.in (for metro)');
    console.log('   - https://nhai.gov.in (for roads/highways)');
    console.log('4. Cross-reference tender info on https://eprocure.gov.in\n');

    process.exit(0);
}

// Check specific project
async function verifyProject(projectName) {
    const result = await query(`
        SELECT 
            id, name, category, area, district,
            department_id, contractor_id,
            budget_display, status,
            ST_Y(location::geometry) AS lat,
            ST_X(location::geometry) AS lng
        FROM projects
        WHERE name ILIKE $1
        LIMIT 1
    `, [`%${projectName}%`]);

    if (result.rows.length === 0) {
        console.log(`❌ Project not found: "${projectName}"`);
        process.exit(1);
    }

    const project = result.rows[0];
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 PROJECT VERIFICATION REPORT');
    console.log('='.repeat(80));
    console.log(`\n📋 Name: ${project.name}`);
    console.log(`📦 Category: ${project.category}`);
    console.log(`📍 Location: ${project.area}, ${project.district}`);
    console.log(`💰 Budget: ${project.budget_display}`);
    console.log(`📊 Status: ${project.status}`);
    console.log(`\n🗺️  GPS Coordinates: ${project.lat}, ${project.lng}`);
    console.log(`🔗 Google Maps: https://www.google.com/maps?q=${project.lat},${project.lng}`);
    console.log(`🔗 Street View: https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${project.lat},${project.lng}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION CHECKLIST:');
    console.log('='.repeat(80));
    console.log('[ ] Open Google Maps link above');
    console.log('[ ] Confirm construction site exists at coordinates');
    console.log('[ ] Search project name on government website:');
    
    if (project.category === 'Metro') {
        console.log('    → https://english.bmrc.co.in/projects');
    } else if (project.category === 'Road' || project.category === 'Bridge') {
        console.log('    → https://nhai.gov.in (highways)');
        console.log('    → https://bbmp.gov.in (city roads)');
    } else if (project.category === 'Hospital') {
        console.log('    → https://bbmp.gov.in');
        console.log('    → https://karnataka.gov.in/health/');
    } else {
        console.log('    → https://bbmp.gov.in');
    }
    
    console.log('[ ] Check tender portal: https://eprocure.gov.in/eprocure/app');
    console.log('[ ] Search news: Google "[project name] bangalore government"');
    console.log('[ ] File RTI if needed: https://rtionline.gov.in');
    
    console.log('\n' + '='.repeat(80));
    console.log('🚩 RED FLAGS (if project is fake):');
    console.log('='.repeat(80));
    console.log('• GPS points to residential area (not construction site)');
    console.log('• No results on government tender portal');
    console.log('• No news coverage or official announcements');
    console.log('• Department doesn\'t exist or doesn\'t match category');
    console.log('• Budget seems unrealistic for project scope');
    console.log('\n');

    process.exit(0);
}

// Run
const args = process.argv.slice(2);
if (args.length === 0) {
    verifyAllProjects().catch(console.error);
} else {
    const projectName = args.join(' ');
    verifyProject(projectName).catch(console.error);
}
