// Authentication controller
const User = require('../models/User');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const { generateToken } = require('../utils/auth');
const { validatePasswordStrength } = require('../utils/validation');

// Register user
const register = catchAsync(async (req, res, next) => {
  const { username, email, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    return next(new AppError('User already exists with this email or username', 400));
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: 'Password does not meet strength requirements',
      details: passwordValidation.errors,
    });
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
  });

  // Generate token
  const token = generateToken(user);

  // Log successful registration
  logger.debugAuth('User registered', user._id, {
    username: user.username,
    email: user.email,
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    },
  });
});

// Login user
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  try {
    // Find user and check password
    const user = await User.findByCredentials(email, password);

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken(user);

    // Log successful login
    logger.debugAuth('User logged in', user._id, {
      username: user.username,
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          lastLogin: user.lastLogin,
        },
        token,
      },
    });
  } catch (error) {
    logger.warn('Failed login attempt', { email, error: error.message });
    return next(new AppError('Invalid credentials', 401));
  }
});

// Get current user profile
const getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .populate('assignedBugs', 'title status priority createdAt')
    .populate('reportedBugs', 'title status priority createdAt');

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        assignedBugs: user.assignedBugs,
        reportedBugs: user.reportedBugs,
      },
    },
  });
});

// Update user profile
const updateProfile = catchAsync(async (req, res, next) => {
  const allowedUpdates = ['firstName', 'lastName', 'avatar'];
  const updates = {};

  // Filter allowed updates
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid updates provided', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  );

  logger.debugAuth('User profile updated', user._id, updates);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
    },
  });
});

// Change password
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide current and new password', 400));
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isCurrentPasswordCorrect = await user.matchPassword(currentPassword);
  if (!isCurrentPasswordCorrect) {
    return next(new AppError('Current password is incorrect', 400));
  }

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: 'New password does not meet strength requirements',
      details: passwordValidation.errors,
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.debugAuth('Password changed', user._id, { username: user.username });

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

// Logout (if using token blacklisting)
const logout = catchAsync(async (req, res, next) => {
  // In a real application, you might want to blacklist the token
  // For now, we'll just send a success response
  
  logger.debugAuth('User logged out', req.user._id, {
    username: req.user.username,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// Get all users (admin only)
const getUsers = catchAsync(async (req, res, next) => {
  const { role, isActive } = req.query;
  const { page, limit, skip } = req.pagination;

  // Build query
  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  // Get users
  const users = await User.find(query)
    .sort(req.sort)
    .skip(skip)
    .limit(limit)
    .select('-password');

  // Get total count
  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// Update user role (admin only)
const updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  const { id } = req.params;

  if (!['reporter', 'developer', 'admin'].includes(role)) {
    return next(new AppError('Invalid role', 400));
  }

  const user = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  logger.debugAuth('User role updated', user._id, {
    newRole: role,
    updatedBy: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: 'User role updated successfully',
    data: { user },
  });
});

// Deactivate user (admin only)
const deactivateUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  logger.debugAuth('User deactivated', user._id, {
    deactivatedBy: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: 'User deactivated successfully',
    data: { user },
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  getUsers,
  updateUserRole,
  deactivateUser,
};
