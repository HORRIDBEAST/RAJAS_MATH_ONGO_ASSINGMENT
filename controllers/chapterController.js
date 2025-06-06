const Chapter = require('./../models/Chapter.js');
const redisClient = require('./../utils/redis.js');
const { CACHE_DURATION, invalidateChaptersCache } = require('./../middleware/cache.js');
const crypto = require('crypto');


const slugify = (text) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

exports.getAllChapters = async (req, res, next) => {
    try {
        const { class: className, unit: unitName, status, weakChapters, subject: subjectName, page = 1, limit = 10 } = req.query;

        const queryFilter = {};
        if (className) queryFilter.class_name = className;
        if (unitName) queryFilter.unit_name = unitName;
        if (status) queryFilter.status = status;
        if (weakChapters !== undefined) queryFilter.weak_chapter = (weakChapters === 'true' || weakChapters === true);
        if (subjectName) queryFilter.subject_name = subjectName;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const totalChapters = await Chapter.countDocuments(queryFilter);
        
        const chapters = await Chapter.find(queryFilter)
            .sort({ subject_name: 1, name: 1 })
            .skip(skip)
            .limit(limitNum)
            .lean();
        
        if (res.locals.cacheKey) {
        
            const allFilteredChaptersForCache = await Chapter.find(queryFilter).sort({ subject_name: 1, name: 1 }).lean();
            const cacheData = {
                totalChapters: allFilteredChaptersForCache.length,
                chapters: allFilteredChaptersForCache
            };
            await redisClient.setex(res.locals.cacheKey, CACHE_DURATION, JSON.stringify(cacheData));
            console.log(`Data cached for key: ${res.locals.cacheKey}`);
        }

        res.status(200).json({
            success: true,
            fromCache: false,
            count: chapters.length,
            totalChapters: totalChapters,
            totalPages: Math.ceil(totalChapters / limitNum),
            currentPage: pageNum,
            chapters,
        });

    } catch (error) {
        console.error('Error in getAllChapters:', error);
        next(error);
    }
};



exports.getChapterById = async (req, res, next) => {
    try {
        const chapterId = req.params.id;
        const cacheKey = `chapter:${chapterId}`;

        const cachedChapter = await redisClient.get(cacheKey);
        if (cachedChapter) {
            console.log(`Cache HIT for chapter: ${chapterId}`);
            return res.status(200).json({
                success: true,
                fromCache: true,
                chapter: JSON.parse(cachedChapter)
            });
        }

        console.log(`Cache MISS for chapter: ${chapterId}`);
        const chapter = await Chapter.findOne({ chapter_id: chapterId }).lean();

        if (!chapter) {
            return res.status(404).json({ success: false, message: 'Chapter not found' });
        }

        await redisClient.setex(cacheKey, CACHE_DURATION, JSON.stringify(chapter));
        console.log(`Chapter ${chapterId} cached.`);

        res.status(200).json({ success: true, fromCache: false, chapter });
    } catch (error) {
        console.error('Error in getChapterById:', error);
        if (error.kind === 'ObjectId' && error.path === '_id') {
            return res.status(404).json({ success: false, message: 'Chapter not found (invalid ID format for search)' });
        }
        next(error);
    }
};


exports.uploadChapters = async (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.chaptersFile) {
        return res.status(400).json({ success: false, message: 'No JSON file uploaded (expected field name: chaptersFile).' });
    }

    const chaptersFile = req.files.chaptersFile;

    if (chaptersFile.mimetype !== 'application/json') {
        return res.status(400).json({ success: false, message: 'Invalid file type. Only JSON is allowed.' });
    }

    try {
        const fileData = chaptersFile.data.toString('utf8');


        let chaptersToUpload;
        try {
            chaptersToUpload = JSON.parse(fileData);
        } catch (parseError) {
            return res.status(400).json({ success: false, message: 'Invalid JSON format in the uploaded file.', details: parseError.message });
        }
        

        if (!Array.isArray(chaptersToUpload)) {
            return res.status(400).json({ success: false, message: 'JSON file should contain an array of chapter objects.' });
        }

        const successfullyUploaded = [];
        const failedUploads = [];

        for (const chapterData of chaptersToUpload) {
            try {
                const generatedChapterId = chapterData.chapter_id || slugify(`${chapterData.subject}-${chapterData.chapter}`);

                const chapterToSave = {
                    chapter_id: generatedChapterId,
                    name: chapterData.chapter,
                    subject_name: chapterData.subject,
                    class_name: chapterData.class,
                    unit_name: chapterData.unit,
                    status: chapterData.status,
                    weak_chapter: chapterData.isWeakChapter,
                    yearWiseQuestionCount: chapterData.yearWiseQuestionCount,
                    questionSolved: chapterData.questionSolved
                };

                const newChapter = await Chapter.findOneAndUpdate(
                    { chapter_id: chapterToSave.chapter_id },
                    chapterToSave,
                    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
                );

                if (newChapter) {
                    successfullyUploaded.push(newChapter.toObject());
                } else {
                    throw new Error("Chapter upsert failed unexpectedly.");
                }
                
            } catch (validationError) {
                failedUploads.push({
                    providedChapterData: chapterData,
                    error: validationError.message,
                    errors: validationError.errors ? Object.values(validationError.errors).map(e => e.message) : []
                });
            }
        }

        await invalidateChaptersCache('chapters:all');
        for (const ch of successfullyUploaded) {
            await redisClient.del(`chapter:${ch.chapter_id}`);
        }
        console.log('Relevant caches invalidated after chapter upload.');

        if (failedUploads.length > 0) {
            return res.status(207).json({
                success: true,
                message: 'Partially uploaded chapters. Some chapters failed validation.',
                successfullyUploadedCount: successfullyUploaded.length,
                failedUploadsCount: failedUploads.length,
                successfullyUploaded,
                failedUploads
            });
        }

        res.status(201).json({
            success: true,
            message: 'All chapters uploaded successfully.',
            successfullyUploadedCount: successfullyUploaded.length,
            chapters: successfullyUploaded
        });

    } catch (error) {
        console.error('Error in uploadChapters:', error);
        next(error);
    }
};
