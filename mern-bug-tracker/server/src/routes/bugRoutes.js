// Bug routes
const express = require('express');
const { body, param } = require('express-validator');
const {
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
} = require('../controllers/bugController');
const { protect, authorize, canModifyResource } = require('../middleware/auth');
const { validateRequest, validatePagination, validateSort } = require('../middleware/validation');

const router = express.Router();

// Validation rules
const createBugValidation = [
  body('title')
    .notEmpty()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title is required and must not exceed 200 characters'),
  body('description')
    .notEmpty()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description is required and must not exceed 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be low, medium, high, or critical'),
  body('severity')
    .optional()
    .isIn(['minor', 'major', 'critical', 'blocker'])
    .withMessage('Severity must be minor, major, critical, or blocker'),
  body('category')
    .optional()
    .isIn(['bug', 'feature', 'enhancement', 'task'])
    .withMessage('Category must be bug, feature, enhancement, or task'),
  body('environment')
    .optional()
    .isIn(['development', 'staging', 'production'])
    .withMessage('Environment must be development, staging, or production'),
  body('stepsToReproduce')
    .optional()
    .isArray()
    .withMessage('Steps to reproduce must be an array'),
  body('stepsToReproduce.*.step')
    .if(body('stepsToReproduce').exists())
    .notEmpty()
    .withMessage('Each step must have content'),
  body('stepsToReproduce.*.order')
    .if(body('stepsToReproduce').exists())
    .isInt({ min: 1 })
    .withMessage('Each step must have a valid order number'),
  body('expectedResult')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Expected result must not exceed 1000 characters'),
  body('actualResult')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Actual result must not exceed 1000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
];

const updateBugValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('status')
    .optional()
    .isIn(['open', 'in-progress', 'testing', 'resolved', 'closed'])
    .withMessage('Status must be open, in-progress, testing, resolved, or closed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be low, medium, high, or critical'),
  body('severity')
    .optional()
    .isIn(['minor', 'major', 'critical', 'blocker'])
    .withMessage('Severity must be minor, major, critical, or blocker'),
  body('category')
    .optional()
    .isIn(['bug', 'feature', 'enhancement', 'task'])
    .withMessage('Category must be bug, feature, enhancement, or task'),
  body('environment')
    .optional()
    .isIn(['development', 'staging', 'production'])
    .withMessage('Environment must be development, staging, or production'),
];

const assignBugValidation = [
  body('assigneeId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid assignee ID is required'),
];

const addCommentValidation = [
  body('content')
    .notEmpty()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment content is required and must not exceed 1000 characters'),
];

const mongoIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid bug ID'),
];

// Apply authentication to all routes
router.use(protect);

// Public bug routes (all authenticated users)
router.get('/', validatePagination, validateSort, getBugs);
router.get('/statistics', getBugStatistics);
router.get('/my-assigned', validatePagination, validateSort, getMyAssignedBugs);
router.get('/my-reported', validatePagination, validateSort, getMyReportedBugs);
router.get('/:id', mongoIdValidation, validateRequest, getBug);

// Bug creation (reporters, developers, admins)
router.post(
  '/',
  authorize('reporter', 'developer', 'admin'),
  createBugValidation,
  validateRequest,
  createBug
);

// Bug modification routes
router.put(
  '/:id',
  mongoIdValidation,
  updateBugValidation,
  validateRequest,
  canModifyResource('id'),
  updateBug
);

router.delete(
  '/:id',
  mongoIdValidation,
  validateRequest,
  canModifyResource('id'),
  deleteBug
);

// Bug assignment (developers and admins)
router.put(
  '/:id/assign',
  mongoIdValidation,
  assignBugValidation,
  validateRequest,
  authorize('developer', 'admin'),
  assignBug
);

// Comments (all authenticated users)
router.post(
  '/:id/comments',
  mongoIdValidation,
  addCommentValidation,
  validateRequest,
  addComment
);

// Watchers (all authenticated users)
router.put(
  '/:id/watch',
  mongoIdValidation,
  validateRequest,
  toggleWatcher
);

module.exports = router;
