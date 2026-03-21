require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Multi-part form data handler (for images)
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Multer configuration: Use memory storage so we don't save ephemeral files on Render
const fileUpload = multer({ storage: multer.memoryStorage() }).single('image');

// Cloudinary configuration: Make sure these exist in your Render env variables!
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to upload the binary image to Cloudinary
const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const cld_upload_stream = cloudinary.uploader.upload_stream(
            { folder: "wanya_alerts" },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );
        streamifier.createReadStream(file.buffer).pipe(cld_upload_stream);
    });
};


// --- GET PRIVATE DASHBOARD ALERTS: Fetch all community alerts ---
router.get('/', async (req, res) => {
    try {
        const [posts] = await pool.query(`
            SELECT n.*, u.full_name as author_name
            FROM notifications n
            JOIN users u ON n.author_id = u.id
            ORDER BY n.created_at DESC
        `);
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- POST NEW ALERT: Creates a detailed post with a required image ---
// Note: This route is now a multi-step process.
router.post('/', fileUpload, async (req, res) => {
    try {
        // Step A: Extract all text fields from the body
        const { author_id, type, title, nickname, description, last_seen_place, contact_info, scope, target_area } = req.body;

        // Step B: Ensure all required fields exist (preventing DB errors)
        if (!author_id || !type || !title || !description || !scope) {
            return res.status(400).json({ error: "Missing required fields (author, type, title, description, scope)" });
        }

        // Step C: Require the image
        if (!req.file) {
            return res.status(400).json({ error: "An image is required for Missing Person reports." });
        }

        // Step D: Upload binary image data to Cloudinary
        console.log("Uploading photo to Cloudinary...");
        const result = await uploadToCloudinary(req.file);
        const imageUrl = result.secure_url;
        console.log("Uploaded successfully. URL:", imageUrl);

        // Step E: Perform DB Insert into the PERFECT, detailed notifications table
        // Count: There are 11 columns listed here.
        const sql = `
            INSERT INTO notifications (
                author_id, type, title, nickname, description, last_seen_place, 
                contact_info, scope, target_area, image_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Count: We are passing exactly 11 data values to match.
        await pool.query(sql, [
            author_id, 
            type, 
            title, 
            nickname || null, 
            description, 
            last_seen_place || null, 
            contact_info || null, 
            scope, 
            target_area || null, 
            imageUrl
        ]);

        res.status(201).json({ message: "Broadcasted. Alert active.", imageUrl });
    } catch (err) {
        console.error("ALERT BROADCAST ERROR:", err);
        // This will send back the *actual* DB error message, which is crucial for TiDB debugging
        res.status(500).json({ error: err.message || "Broadcast failed" });
    }
});

module.exports = router;