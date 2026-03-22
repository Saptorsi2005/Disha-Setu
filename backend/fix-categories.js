require('dotenv').config();
const { query } = require('./src/config/db');

async function fix() {
  console.log('Starting DB fix...');
  try {
    await query(`UPDATE projects SET category = 'road' WHERE name ILIKE '%expressway%' OR name ILIKE '%corridor%' OR name ILIKE '%highway%' OR name ILIKE '%road%'`);
    await query(`UPDATE projects SET category = 'metro' WHERE name ILIKE '%metro%' OR name ILIKE '%rail%'`);
    await query(`UPDATE projects SET category = 'sewage' WHERE name ILIKE '%sewage%' OR name ILIKE '%drainage%' OR name ILIKE '%flood%'`);
    await query(`UPDATE projects SET category = 'water' WHERE name ILIKE '%water%' OR name ILIKE '%river%' OR name ILIKE '%lake%'`);
    await query(`UPDATE projects SET category = 'hospital' WHERE name ILIKE '%hospital%' OR name ILIKE '%medical%' OR name ILIKE '%health%'`);
    await query(`UPDATE projects SET category = 'building' WHERE name ILIKE '%housing%' OR name ILIKE '%center%' OR name ILIKE '%building%' OR name ILIKE '%facility%'`);
    await query(`UPDATE projects SET category = 'college' WHERE name ILIKE '%school%' OR name ILIKE '%college%' OR name ILIKE '%institute%'`);
    await query(`UPDATE projects SET category = 'park' WHERE name ILIKE '%park%' OR name ILIKE '%garden%' OR name ILIKE '%green%'`);
    await query(`UPDATE projects SET category = 'bridge' WHERE name ILIKE '%bridge%' OR name ILIKE '%sea link%'`);
    console.log('Fixed categories successfully');
  } catch(e) {
    console.error('Error fixing db', e);
  }
  process.exit();
}

fix();
