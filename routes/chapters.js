const express = require('express');
const router = express.Router();
const {
    getAllChapters,
    getChapterById,
    uploadChapters
} = require('./../controllers/chapterController');
const { isAdmin } = require('./../middleware/auth');
const { cacheGetAllChapters } = require('./../middleware/cache');
router.get('/', cacheGetAllChapters, getAllChapters);
router.get('/:id', getChapterById);
router.post('/', isAdmin, uploadChapters);

module.exports = router;
