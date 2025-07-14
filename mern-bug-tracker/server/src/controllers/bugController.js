// Bug controller
const Bug = require('../models/Bug');
const User = require('../models/User');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const { validateStatusTransition } = require('../utils/validation');

// Create a new bug
const createBug = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    priority,
    severity,
    category,
    environment,
    stepsToReproduce,
    expectedResult,
    actualResult,
    tags,
    dueDate,
  } = req.body;

  // Create bug with reporter set to current user
  const bug = await Bug.create({
    title,
    description,
    priority,
    severity,
    category,
    environment,
    stepsToReproduce,
    expectedResult,
    actualResult,
    tags,
    dueDate,
    reporter: req.user._id,
  });

  // Populate the bug with reporter details
  await bug.populate('reporter', 'username email firstName lastName');

  logger.info(`Bug created: ${bug.title}`, {
    bugId: bug._id,
    reporter: req.user.username,
    priority: bug.priority,
  });

  res.status(201).json({
    success: true,
    message: 'Bug created successfully',
    data: { bug },
  });
});

// Get all bugs with filtering, sorting, and pagination
const getBugs = catchAsync(async (req, res, next) => {
  const {
    status,
    priority,
    severity,
    category,
    environment,
    assignee,
    reporter,
    search,
  } = req.query;

  const { page, limit, skip } = req.pagination;

  // Build query
  const query = {};
  
  if (status) {
    query.status = Array.isArray(status) ? { $in: status } : status;
  }
  
  if (priority) {
    query.priority = Array.isArray(priority) ? { $in: priority } : priority;
  }
  
  if (severity) {
    query.severity = Array.isArray(severity) ? { $in: severity } : severity;
  }
  
  if (category) {
    query.category = Array.isArray(category) ? { $in: category } : category;
  }
  
  if (environment) {
    query.environment = Array.isArray(environment) ? { $in: environment } : environment;
  }
  
  if (assignee) {
    query.assignee = assignee;
  }
  
  if (reporter) {
    query.reporter = reporter;
  }
  
  if (search) {
    query.$text = { $search: search };
  }

  // Get bugs
  const bugs = await Bug.find(query)
    .populate('assignee', 'username email firstName lastName')
    .populate('reporter', 'username email firstName lastName')
    .populate('comments.author', 'username firstName lastName')
    .sort(req.sort)
    .skip(skip)
    .limit(limit);

  // Get total count
  const total = await Bug.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      bugs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// Get single bug by ID
const getBug = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const bug = await Bug.findById(id)
    .populate('assignee', 'username email firstName lastName role')
    .populate('reporter', 'username email firstName lastName role')
    .populate('comments.author', 'username firstName lastName')
    .populate('watchers', 'username firstName lastName');

  if (!bug) {
    return next(new AppError('Bug not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { bug },
  });
});

// Update bug
const updateBug = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  // Remove fields that shouldn't be updated directly
  delete updates.reporter;
  delete updates.createdAt;
  delete updates.comments;

  // Handle status transitions
  if (updates.status) {
    const bug = await Bug.findById(id);
    if (!bug) {
      return next(new AppError('Bug not found', 404));
    }

    if (!validateStatusTransition(bug.status, updates.status)) {
      return next(new AppError(
        `Invalid status transition from ${bug.status} to ${updates.status}`,
        400
      ));
    }
  }

  const bug = await Bug.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })
    .populate('assignee', 'username email firstName lastName')
    .populate('reporter', 'username email firstName lastName');

  if (!bug) {
    return next(new AppError('Bug not found', 404));
  }

  logger.info(`Bug updated: ${bug.title}`, {
    bugId: bug._id,
    updatedBy: req.user.username,
    updates: Object.keys(updates),
  });

  res.status(200).json({
    success: true,
    message: 'Bug updated successfully',
    data: { bug },
  });
});

// Delete bug
const deleteBug = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const bug = await Bug.findById(id);

  if (!bug) {
    return next(new AppError('Bug not found', 404));
  }

  // Check if user can delete (reporter or admin)
  if (bug.reporter.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('You can only delete bugs you reported', 403));
  }

  await Bug.findByIdAndDelete(id);

  logger.info(`Bug deleted: ${bug.title}`, {
    bugId: bug._id,
    deletedBy: req.user.username,
  });

  res.status(200).json({
    success: true,
    message: 'Bug deleted successfully',
  });
});

// Assign bug to user
const assignBug = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { assigneeId } = req.body;

  // Validate assignee exists and is a developer or admin
  const assignee = await User.findById(assigneeId);
  if (!assignee) {
    return next(new AppError('Assignee not found', 404));
  }

  if (!['developer', 'admin'].includes(assignee.role)) {
    return next(new AppError('User must be a developer or admin to be assigned bugs', 400));
  }

  const bug = await Bug.findByIdAndUpdate(
    id,
    { assignee: assigneeId },
    { new: true }
  )
    .populate('assignee', 'username email firstName lastName')
    .populate('reporter', 'username email firstName lastName');

  if (!bug) {
    return next(new AppError('Bug not found', 404));
  }

  logger.info(`Bug assigned: ${bug.title}`, {
    bugId: bug._id,
    assignee: assignee.username,
    assignedBy: req.user.username,
  });

  res.status(200).json({
    success: true,
    message: 'Bug assigned successfully',
    data: { bug },
  });
});

// Add comment to bug
const addComment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return next(new AppError('Comment content is required', 400));
  }

  const bug = await Bug.findById(id);
  if (!bug) {
    return next(new AppError('Bug not found', 404));
  }

  bug.comments.push({
    author: req.user._id,
    content: content.trim(),
  });

  await bug.save();

  // Populate the newly added comment
  await bug.populate('comments.author', 'username firstName lastName');

  logger.info(`Comment added to bug: ${bug.title}`, {
    bugId: bug._id,
    author: req.user.username,
  });

  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: { 
      comment: bug.comments[bug.comments.length - 1],
      bug: {
        id: bug._id,
        title: bug.title,
        commentsCount: bug.comments.length,
      },
    },
  });
});

// Add/remove watcher
const toggleWatcher = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const bug = await Bug.findById(id);
  if (!bug) {
    return next(new AppError('Bug not found', 404));
  }

  const isWatching = bug.watchers.includes(userId);

  if (isWatching) {
    bug.watchers = bug.watchers.filter(watcher => !watcher.equals(userId));
  } else {
    bug.watchers.push(userId);
  }

  await bug.save();

  logger.info(`User ${isWatching ? 'stopped watching' : 'started watching'} bug: ${bug.title}`, {
    bugId: bug._id,
    user: req.user.username,
  });

  res.status(200).json({
    success: true,
    message: `${isWatching ? 'Stopped watching' : 'Started watching'} bug`,
    data: { 
      isWatching: !isWatching,
      watchersCount: bug.watchers.length,
    },
  });
});

// Get bug statistics
const getBugStatistics = catchAsync(async (req, res, next) => {
  const stats = await Bug.getStatistics();

  // Get additional statistics
  const [recentBugs, overdueCount, myBugsCount] = await Promise.all([
    Bug.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('reporter', 'username firstName lastName')
      .select('title status priority createdAt'),
    
    Bug.countDocuments({
      dueDate: { $lt: new Date() },
      status: { $nin: ['resolved', 'closed'] },
    }),
    
    Bug.countDocuments({ 
      $or: [
        { reporter: req.user._id },
        { assignee: req.user._id },
      ],
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        ...stats,
        overdue: overdueCount,
        myBugs: myBugsCount,
      },
      recentBugs,
    },
  });
});

// Get bugs assigned to current user
const getMyAssignedBugs = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = req.pagination;

  const bugs = await Bug.find({ assignee: req.user._id })
    .populate('reporter', 'username email firstName lastName')
    .sort(req.sort)
    .skip(skip)
    .limit(limit);

  const total = await Bug.countDocuments({ assignee: req.user._id });

  res.status(200).json({
    success: true,
    data: {
      bugs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// Get bugs reported by current user
const getMyReportedBugs = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = req.pagination;

  const bugs = await Bug.find({ reporter: req.user._id })
    .populate('assignee', 'username email firstName lastName')
    .sort(req.sort)
    .skip(skip)
    .limit(limit);

  const total = await Bug.countDocuments({ reporter: req.user._id });

  res.status(200).json({
    success: true,
    data: {
      bugs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

module.exports = {
  createBug,
  getBugs,
  getBug,
  updateBug,
  deleteBug,
  assignBug,
  addComment,
  toggleWatcher,
  getBugStatistics,
  getMyAssignedBugs,
  getMyReportedBugs,
};
