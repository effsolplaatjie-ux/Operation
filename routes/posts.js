const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST: Create a new alert (SAPS/CPF/Admin only)
router.post('/', async (req, res) => {
    const { 
        type, title, nickname, description, last_seen, 
        contact_info, scope, target_area, image_data 
    } = req.body;
    
    try {
        const [result] = await pool.query(
            `INSERT INTO notifications 
            (type, title, nickname, description, last_seen_place, contact_info, scope, target_area, image_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [type, title, nickname, description, last_seen, contact_info, scope, target_area, image_data]
        );
        
        // Logic for Push Notifications to users in the target_area would be triggered here
        res.status(201).json({ message: "Alert published successfully", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: All active posts for residents to view
router.get('/active', async (req, res) => {
    try {
        const [posts] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;