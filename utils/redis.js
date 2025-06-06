const Redis = require('ioredis');

const redisURL = process.env.REDIS_URL ;

console.log(`Connecting to Redis at ${redisURL}`);

const redisClient = new Redis(redisURL);

redisClient.on('connect', () => {
    console.log('Attempting to connect to Redis...');
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

module.exports = redisClient;
