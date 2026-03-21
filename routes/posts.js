const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET: Fetch all active alerts for the community
router.get('/', async (req, res) => {
    try {
        const [posts] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Create a new alert
router.post('/', async (req, res) => {
    try {
        const { type, title, description, last_seen_place, scope, author_id } = req.body;
        const sql = `INSERT INTO notifications (type, title, description, last_seen_place, scope, author_id) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [type, title, description, last_seen_place, scope, author_id]);
        
        res.json({ message: "Alert broadcasted to the community." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;