const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// --- REGISTER ROUTE ---
router.post('/register', async (req, res) => {
    try {
        const { 
            role, username, password, full_name, email, phone,
            house_no, street, suburb, city, municipality, district_municipality, province, country,
            station_name, area_of_operation, contact_person_name, contact_person_details
        } = req.body;

        // Hash the password for security
        const hash = await bcrypt.hash(password, 10);
        
        // Residents are auto-approved. SAPS/CPF/Orgs must wait for Admin.
        const status = (role === 'resident') ? 'approved' : 'pending';

        // EXACTLY 19 COLUMNS
        const sql = `INSERT INTO users (
            role, status, username, password_hash, full_name, email, phone,
            house_no, street, suburb, city, municipality, district_municipality, province, country,
            station_name, area_of_operation, contact_person_name, contact_person_details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; 
        // EXACTLY 19 QUESTION MARKS (No trailing commas or stray marks!)

        // EXACTLY 19 VALUES
        await pool.query(sql, [
            role, 
            status, 
            username, 
            hash, 
            full_name, 
            email || null, 
            phone || null,
            house_no || null, 
            street || null, 
            suburb || null, 
            city || null, 
            municipality || null, 
            district_municipality || null, 
            province || null, 
            country || 'South Africa', 
            station_name || null, 
            area_of_operation || null, 
            contact_person_name || null, 
            contact_person_details || null
        ]);

        res.status(201).json({ message: "Registration successful" });
    } catch (err) {
        console.error("REGISTRATION SQL ERROR:", err);
        // This sends the exact DB error to your frontend console if it fails again
        res.status(500).json({ error: err.sqlMessage || "Database insertion failed" });
    }
});


// --- LOGIN ROUTE ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Hardcoded Admin Access
    if (username === 'admin' && password === 'admin') {
        const token = jwt.sign({ id: 0, role: 'admin' }, process.env.JWT_SECRET || 'wanya_secret');
        return res.json({ token, role: 'admin', userId: 0 });
    }

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, users[0].password_hash);
        if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

        // Block login if CPF/SAPS/Org is still pending
        if (users[0].status === 'pending') {
            return res.status(403).json({ message: "Your account is pending Admin approval." });
        }

        const token = jwt.sign({ id: users[0].id, role: users[0].role }, process.env.JWT_SECRET || 'wanya_secret');
        res.json({ token, role: users[0].role, userId: users[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;