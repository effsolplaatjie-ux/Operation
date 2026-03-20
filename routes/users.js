const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to protect routes
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
        if (req.user.role === 'admin') return res.json({ role: 'admin', full_name: 'System Admin' });
        
        const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (user.length === 0) return res.status(404).json({ message: "User not found" });
        
        res.json(user[0]); 
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN: GET PENDING ACCOUNTS ---
// Matches the fetch(`${API_URL}/pending`) in admin.html
router.get('/pending', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });
        
        const [orgs] = await pool.query('SELECT * FROM users WHERE status = "pending"');
        res.json(orgs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN: APPROVE/REMOVE ACTION ---
// Fixed with Try/Catch and matches admin.html handleAction()
router.post('/action', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });
        
        const { userId, action } = req.body; 
        
        if (action === 'approve') {
            await pool.query('UPDATE users SET status = "approved" WHERE id = ?', [userId]);
        } else if (action === 'remove') {
            await pool.query('DELETE FROM users WHERE id = ?', [userId]);
        } else {
            return res.status(400).json({ message: "Invalid action type" });
        }
        
        res.json({ message: `Account successfully ${action}d.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PROFILE UPDATE: For edit-profile.html ---
// Added to save changes from the frontend
router.put('/:id', auth, async (req, res) => {
    try {
        const { full_name, phone, house_no, street, suburb, city, municipality, province } = req.body;
        const targetId = req.params.id;

        // Security check: Only self or admin can edit
        if (req.user.id != targetId && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const sql = `
            UPDATE users 
            SET full_name = ?, phone = ?, house_no = ?, street = ?, suburb = ?, city = ?, municipality = ?, province = ?
            WHERE id = ?
        `;
        
        await pool.query(sql, [
            full_name, phone, house_no, street, suburb, city, municipality, province, targetId
        ]);

        res.json({ message: "Profile updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;