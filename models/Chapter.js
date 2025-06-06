const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
    chapter_id: {
        type: String,
        required: [true, 'Chapter ID is required.'],
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: [true, 'Chapter name is required.'],
        trim: true,
    },
    subject_name: {
        type: String,
        required: [true, 'Subject name is required.'],
        trim: true,
    },
    class_name: {
        type: String,
        required: [true, 'Class name is required.'],
        trim: true,
    },
    unit_name: {
        type: String,
        required: [true, 'Unit name is required.'],
        trim: true,
    },
    status: {
        type: String,
        enum: ['To Do', 'Doing', 'Done', 'Pending', 'Skipped', 'Not Started', 'Completed', 'In Progress'],
        default: 'Not Started',
    },
    weak_chapter: {
        type: Boolean,
        default: false,
    },
    yearWiseQuestionCount: {
        type: mongoose.Schema.Types.Mixed, //Mixed type for arbitrary key-value pairs
        default: {}
    },
    questionSolved: {
        type: Number,
        default: 0
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});


chapterSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Indexing for frequently queried fields
chapterSchema.index({ subject_name: 1 });
chapterSchema.index({ class_name: 1 });
chapterSchema.index({ unit_name: 1 });
chapterSchema.index({ status: 1 });
chapterSchema.index({ weak_chapter: 1 });

const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;
