require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db'); // This uses your existing db.js connection

async function createAdmin() {
    try {
        const username = 'Wanya';
        const plainPassword = 'Wanya1';
        
        // 1. Hash the password using bcrypt (10 rounds of salt)
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        
        // 2. The MySQL query to insert the admin
        const [result] = await pool.query(
            `INSERT INTO users (role, status, first_name, last_name, username, password_hash) 
             VALUES ('admin', 'approved', 'System', 'Admin', ?, ?)`,
            [username, hashedPassword]
        );

        console.log(`✅ Admin account created successfully!`);
        console.log(`Username: ${username}`);
        console.log(`Hashed Password saved to DB: ${hashedPassword}`);
        
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            console.log('⚠️ An admin with this username already exists in the database.');
        } else {
            console.error('❌ Database error:', err);
        }
    } finally {
        process.exit();
    }
}

createAdmin();