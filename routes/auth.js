const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// REGISTER USER
router.post('/register', async (req, res) => {
    const { 
        role, username, password, full_name, email, phone,
        house_no, street, suburb, city, municipality, district, province, country,
        area_of_operation, station_name, contact_person
    } = req.body;

    try {
        const hash = await bcrypt.hash(password, 10);
        
        // Residents are auto-approved. Authorities stay 'pending' for Admin approval.
        const status = (role === 'resident') ? 'approved' : 'pending';

        const sql = `INSERT INTO users (
            role, status, username, password_hash, full_name, email, phone,
            house_no, street, suburb, city, municipality, district, province, country,
            area_of_operation, station_name, contact_person
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await pool.query(sql, [
            role, status, username, hash, full_name, email, phone,
            house_no, street, suburb, city, municipality, district, province, country,
            area_of_operation, station_name, contact_person
        ]);

        res.status(201).json({ message: "Registration successful. Log in to continue." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Registration failed. Username may be taken." });
    }
});

// LOGIN USER
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Hardcoded Admin requirement
    if (username === 'admin' && password === 'admin') {
        const token = jwt.sign({ id: 0, role: 'admin' }, process.env.JWT_SECRET || 'wanya_secret');
        return res.json({ token, role: 'admin', username: 'admin' });
    }

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ message: "User not found" });

        const user = users[0];
        if (user.status !== 'approved') return res.status(403).json({ message: "Account pending Admin approval." });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: "Invalid password" });

        const token = jwt.sign(
            { id: user.id, role: user.role, municipality: user.municipality }, 
            process.env.JWT_SECRET || 'wanya_secret', 
            { expiresIn: '24h' }
        );

        res.json({ token, role: user.role, userId: user.id });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;