const rateLimit = require('express-rate-limit');
let RedisStore = require('rate-limit-redis'); 
const redisClient = require('./../utils/redis'); 

if (RedisStore.default && typeof RedisStore.default === 'function') {
    RedisStore = RedisStore.default;
}

const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000; 
const rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 30; 

const rateLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient, 
        prefix: 'rl:', 
      
    }),
    windowMs: rateLimitWindowMs, 
    max: rateLimitMaxRequests,     
    standardHeaders: true, 
    legacyHeaders: false,  
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after a minute.'
    },
    keyGenerator: (req, res) => {
        // Custom key generator to use the request IP address
        return req.ip;
    },
    handler: (req, res, next, options) => {        // Custom handler to log when a rate limit is hit (optional)
        console.warn(`Rate limit exceeded for IP: ${req.ip}. URI: ${req.originalUrl}. Options Status: ${options.statusCode}`);
        res.status(options.statusCode).send(options.message);
    }
});

module.exports = { rateLimiter };
