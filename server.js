require('dotenv').config();

const express = require('express');
const fileUpload = require('express-fileupload');
const connectDB = require('./config/db');
const redisClient = require('./utils/redis'); 
const chapterRoutes = require('./routes/chapters');
const { rateLimiter } = require('./middleware/rateLimiter');

const app = express();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    useTempFiles: false
}));

// Applying rate limiter to all routes
app.use('/api/v1/', rateLimiter);


app.get('/', (req, res) => {
    res.send('Chapter Performance Dashboard API is running!');
});

app.use('/api/v1/chapters', chapterRoutes);


//Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Server Error'
    });
});

const PORT = process.env.PORT || 3905;

redisClient.on('connect', () => {
    console.log('Connected to Redis successfully!');
    app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
    process.exit(1);
});

module.exports = app;
