const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to protect private details
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Access Denied" });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'wanya_secret');
        next();
    } catch (e) { 
        res.status(400).json({ message: "Invalid Token" }); 
    }
};

// --- GET PRIVATE DASHBOARD DETAILS ---
router.get('/dashboard', auth, async (req, res) => {
    try {
        if (req.user.role === 'admin') return res.json({ role: 'admin' });
        
        const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (user.length === 0) return res.status(404).json({ message: "User not found" });
        
        res.json(user[0]); 
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN: GET PENDING ACCOUNTS (Renamed from /pending-orgs to fix 404) ---
router.get('/pending', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });
        
        const [orgs] = await pool.query('SELECT * FROM users WHERE status = "pending"');
        res.json(orgs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN: APPROVE/REMOVE ACTION (Added try/catch) ---
router.post('/action', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });
        
        const { userId, action } = req.body; 
        
        if (action === 'approve') {
            await pool.query('UPDATE users SET status = "approved" WHERE id = ?', [userId]);
        } else if (action === 'remove') {
            await pool.query('DELETE FROM users WHERE id = ?', [userId]);
        } else {
            return res.status(400).json({ message: "Invalid action" });
        }
        
        res.json({ message: `Account ${action}d successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PROFILE UPDATE: For edit-profile.html ---
router.put('/:id', auth, async (req, res) => {
    try {
        const { full_name, phone, house_no, street, suburb, city, province } = req.body;
        const targetId = req.params.id;

        // Security check: Users can only edit themselves, unless they are admin
        if (req.user.id != targetId && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized to edit this profile" });
        }

        const sql = `
            UPDATE users 
            SET full_name = ?, phone = ?, house_no = ?, street = ?, suburb = ?, city = ?, province = ?
            WHERE id = ?
        `;
        
        await pool.query(sql, [
            full_name, phone, house_no, street, suburb, city, province, targetId
        ]);

        res.json({ message: "Profile updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;