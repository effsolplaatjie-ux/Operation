require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');

const app = express();

// CORS Settings for Netlify/Render compatibility
app.use(cors({
    origin: '*', // For production, replace with your specific Netlify URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);


// Root test route
app.get('/', (req, res) => res.send("Wanya Tsotsi API is Online"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Wanya Tsotsi Backend live on port ${PORT}`));