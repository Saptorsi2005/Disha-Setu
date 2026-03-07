/**
 * scripts/setup-admin.js
 * Setup script to initialize admin user and run migration
 * Usage: node scripts/setup-admin.js
 */
require('dotenv').config();
const { query } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('📦 Running admin role migration...');
    
    try {
        const migrationPath = path.join(__dirname, '..', 'migrations', '003_add_admin_role.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        
        await query(sql);
        console.log('✅ Migration completed successfully');
    } catch (err) {
        if (err.code === '42701' || err.message.includes('already exists')) {
            console.log('ℹ️  Migration already applied (role column exists)');
        } else {
            throw err;
        }
    }
}

async function createAdminUser(phone = null, googleId = null) {
    console.log('\n👤 Creating admin user...');
    
    try {
        let result;
        
        if (phone) {
            // Promote existing user by phone to admin
            result = await query(
                `UPDATE users SET role = 'admin' WHERE phone = $1 RETURNING id, name, phone, role`,
                [phone]
            );
            
            if (result.rows.length === 0) {
                console.log(`❌ No user found with phone: ${phone}`);
                return;
            }
        } else if (googleId) {
            // Promote existing user by Google ID to admin
            result = await query(
                `UPDATE users SET role = 'admin' WHERE google_id = $1 RETURNING id, name, google_id, role`,
                [googleId]
            );
            
            if (result.rows.length === 0) {
                console.log(`❌ No user found with Google ID: ${googleId}`);
                return;
            }
        } else {
            // Promote the first user in the database
            result = await query(
                `UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users ORDER BY created_at LIMIT 1) RETURNING id, name, phone, role`
            );
            
            if (result.rows.length === 0) {
                console.log('❌ No users found in database');
                return;
            }
        }
        
        const admin = result.rows[0];
        console.log('✅ Admin user created successfully:');
        console.log(`   ID: ${admin.id}`);
        console.log(`   Name: ${admin.name || 'N/A'}`);
        console.log(`   Phone: ${admin.phone || 'N/A'}`);
        console.log(`   Role: ${admin.role}`);
        
    } catch (err) {
        console.error('❌ Error creating admin user:', err.message);
        throw err;
    }
}

async function main() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   DishaSetu Admin Setup                ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    try {
        // Step 1: Run migration
        await runMigration();
        
        // Step 2: Create admin user
        // Parse command line arguments
        const args = process.argv.slice(2);
        const phoneArg = args.find(arg => arg.startsWith('--phone='));
        const googleArg = args.find(arg => arg.startsWith('--google-id='));
        
        let phone = null;
        let googleId = null;
        
        if (phoneArg) {
            phone = phoneArg.split('=')[1];
        }
        if (googleArg) {
            googleId = googleArg.split('=')[1];
        }
        
        await createAdminUser(phone, googleId);
        
        console.log('\n✨ Admin setup completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Login to the app with your admin account');
        console.log('   2. Go to Settings tab');
        console.log('   3. Click "Admin Dashboard" to access admin features');
        
    } catch (err) {
        console.error('\n❌ Setup failed:', err.message);
        process.exit(1);
    }
    
    process.exit(0);
}

main();
