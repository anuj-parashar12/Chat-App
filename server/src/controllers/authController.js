const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { getRedis } = require('../config/redis');
const { AppError } = require('../middleware/errorHandler');
const { sendEmail } = require('../services/emailService');
const logger = require('../utils/logger');

const signToken = (id, secret, expiresIn) =>
  jwt.sign({ id }, secret, { expiresIn });

const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'strict' };

  res.cookie('accessToken', accessToken, {
    ...cookieOpts,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    ...cookieOpts,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });
};

exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const user = await User.create({ username, email, password });

    const verifyToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;
    await sendEmail({
      to: email,
      subject: 'Verify your NexChat account',
      html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email. Link expires in 24h.</p>`,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) return next(new AppError('Invalid or expired verification token', 400));

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (!user.isEmailVerified) {
      return next(new AppError('Please verify your email first', 401));
    }

    const accessToken = signToken(user._id, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN || '15m');
    const refreshToken = signToken(user._id, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES_IN || '7d');

    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) user.refreshTokens.shift(); // keep last 5
    await user.save({ validateBeforeSave: false });

    setTokenCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      accessToken,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (!token) return next(new AppError('No refresh token', 401));

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshTokens');

    if (!user || !user.refreshTokens.includes(token)) {
      return next(new AppError('Invalid refresh token', 401));
    }

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    const newRefreshToken = signToken(user._id, process.env.JWT_REFRESH_SECRET, '7d');
    user.refreshTokens.push(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    const accessToken = signToken(user._id, process.env.JWT_SECRET, '15m');
    setTokenCookies(res, accessToken, newRefreshToken);

    res.json({ success: true, accessToken });
  } catch (err) {
    next(new AppError('Invalid refresh token', 401));
  }
};

exports.logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;

    if (token) {
      const redis = getRedis();
      // Blacklist access token for its remaining TTL
      const decoded = jwt.decode(token);
      const ttl = decoded?.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) await redis.setex(`blacklist:${token}`, ttl, '1');
    }

    // Remove refresh token from DB
    if (req.cookies?.refreshToken) {
      const user = await User.findById(req.user._id).select('+refreshTokens');
      if (user) {
        user.refreshTokens = user.refreshTokens.filter((t) => t !== req.cookies.refreshToken);
        await user.save({ validateBeforeSave: false });
      }
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    // Always respond 200 to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'NexChat Password Reset',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Expires in 10 minutes.</p>`,
    });

    res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+refreshTokens');

    if (!user) return next(new AppError('Invalid or expired reset token', 400));

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // invalidate all sessions
    await user.save();

    res.json({ success: true, message: 'Password reset successful. Please log in.' });
  } catch (err) {
    next(err);
  }
};
