const redisClient = require('./../utils/redis');

const CACHE_DURATION = parseInt(process.env.CACHE_DURATION_SECONDS, 10) || 3600; 

const cacheGetAllChapters = async (req, res, next) => {

    const queryParams = { ...req.query };
    delete queryParams.page;
    delete queryParams.limit;

    const sortedQueryKeys = Object.keys(queryParams).sort();
    const queryString = sortedQueryKeys.map(key => `${key}=${queryParams[key]}`).join('&');
    
    const cacheKey = `chapters:all:${queryString || 'all'}`; 

    try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log(`Cache HIT for key: ${cacheKey}`);
            const parsedData = JSON.parse(cachedData);
            
            // Pagination logic
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;

            const paginatedResults = parsedData.chapters.slice(startIndex, endIndex);

            return res.status(200).json({
                success: true,
                fromCache: true,
                count: paginatedResults.length,
                totalChapters: parsedData.totalChapters,
                totalPages: Math.ceil(parsedData.totalChapters / limit),
                currentPage: page,
                chapters: paginatedResults,
            });
        } else {
            console.log(`Cache MISS for key: ${cacheKey}`);
            res.locals.cacheKey = cacheKey;
            next();
        }
    } catch (error) {
        console.error('Redis cache error (GET):', error);
        next();
    }
};

const invalidateChaptersCache = async (keyPrefix = 'chapters:all') => {
    try {
        const keys = await redisClient.keys(`${keyPrefix}:*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`Cache invalidated for keys starting with: ${keyPrefix}`);
        }
    } catch (error) {
        console.error('Redis cache invalidation error:', error);
    }
};


module.exports = { cacheGetAllChapters, invalidateChaptersCache, CACHE_DURATION };
