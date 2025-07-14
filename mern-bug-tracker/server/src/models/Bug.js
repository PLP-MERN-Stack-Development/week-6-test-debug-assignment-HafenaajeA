// Bug Model
const mongoose = require('mongoose');

const bugSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a bug title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please provide a bug description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'testing', 'resolved', 'closed'],
    default: 'open',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  severity: {
    type: String,
    enum: ['minor', 'major', 'critical', 'blocker'],
    default: 'major',
  },
  category: {
    type: String,
    enum: ['bug', 'feature', 'enhancement', 'task'],
    default: 'bug',
  },
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'development',
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Bug must have a reporter'],
  },
  stepsToReproduce: [{
    step: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
  }],
  expectedResult: {
    type: String,
    maxlength: [1000, 'Expected result cannot exceed 1000 characters'],
  },
  actualResult: {
    type: String,
    maxlength: [1000, 'Actual result cannot exceed 1000 characters'],
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  watchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  estimatedTime: {
    type: Number, // in hours
    min: 0,
  },
  actualTime: {
    type: Number, // in hours
    min: 0,
  },
  dueDate: {
    type: Date,
  },
  resolvedAt: {
    type: Date,
  },
  closedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for time since creation
bugSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for is overdue
bugSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && !['resolved', 'closed'].includes(this.status);
});

// Virtual for status history (can be implemented later)
bugSchema.virtual('statusHistory', {
  ref: 'BugStatusHistory',
  localField: '_id',
  foreignField: 'bug',
});

// Pre-save middleware
bugSchema.pre('save', function(next) {
  // Set resolved date when status changes to resolved
  if (this.isModified('status')) {
    if (this.status === 'resolved' && !this.resolvedAt) {
      this.resolvedAt = new Date();
    }
    if (this.status === 'closed' && !this.closedAt) {
      this.closedAt = new Date();
    }
  }

  // Sort steps to reproduce by order
  if (this.stepsToReproduce && this.stepsToReproduce.length > 0) {
    this.stepsToReproduce.sort((a, b) => a.order - b.order);
  }

  next();
});

// Instance methods
bugSchema.methods.addComment = function(authorId, content) {
  this.comments.push({
    author: authorId,
    content: content,
  });
  return this.save();
};

bugSchema.methods.addWatcher = function(userId) {
  if (!this.watchers.includes(userId)) {
    this.watchers.push(userId);
    return this.save();
  }
  return this;
};

bugSchema.methods.removeWatcher = function(userId) {
  this.watchers = this.watchers.filter(watcher => !watcher.equals(userId));
  return this.save();
};

bugSchema.methods.updateStatus = function(newStatus, userId) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add to status history if needed
  // This could be implemented as a separate collection
  
  return this.save();
};

// Static methods
bugSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('assignee reporter', 'username email firstName lastName');
};

bugSchema.statics.findByPriority = function(priority) {
  return this.find({ priority }).populate('assignee reporter', 'username email firstName lastName');
};

bugSchema.statics.findByAssignee = function(assigneeId) {
  return this.find({ assignee: assigneeId }).populate('reporter', 'username email firstName lastName');
};

bugSchema.statics.findByReporter = function(reporterId) {
  return this.find({ reporter: reporterId }).populate('assignee', 'username email firstName lastName');
};

bugSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        testing: { $sum: { $cond: [{ $eq: ['$status', 'testing'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } },
      }
    }
  ]);

  return stats[0] || {
    total: 0, open: 0, inProgress: 0, testing: 0, resolved: 0, closed: 0,
    critical: 0, high: 0, medium: 0, low: 0
  };
};

// Indexes for better query performance
bugSchema.index({ status: 1 });
bugSchema.index({ priority: 1 });
bugSchema.index({ assignee: 1 });
bugSchema.index({ reporter: 1 });
bugSchema.index({ category: 1 });
bugSchema.index({ createdAt: -1 });
bugSchema.index({ title: 'text', description: 'text' }); // Text search

module.exports = mongoose.model('Bug', bugSchema);
