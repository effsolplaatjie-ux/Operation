const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to protect private details
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send("Access Denied");
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'wanya_secret');
        next();
    } catch (e) { res.status(400).send("Invalid Token"); }
};

// GET PRIVATE DASHBOARD DETAILS
router.get('/dashboard', auth, async (req, res) => {
    if (req.user.role === 'admin') return res.json({ role: 'admin' });
    
    const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json(user[0]); // Only returns the specific logged-in user's details
});

// ADMIN: GET PENDING ORGANIZATIONS
router.get('/pending-orgs', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const [orgs] = await pool.query('SELECT * FROM users WHERE status = "pending"');
    res.json(orgs);
});

// ADMIN: APPROVE/REMOVE ORG
router.post('/action', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { userId, action } = req.body; // action: 'approve' or 'remove'
    
    if (action === 'approve') {
        await pool.query('UPDATE users SET status = "approved" WHERE id = ?', [userId]);
    } else {
        await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    }
    res.json({ message: "Action completed" });
});

module.exports = router;