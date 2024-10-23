require("dotenv").config();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/UserModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const sendEmail = require("../utils/email");
const { promisify } = require("util");

// Helper function for creating JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Helper function for sending the JWT token
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true", // به‌روزرسانی تنظیمات Secure
    sameSite: "None",
  };
  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

// Signup
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createSendToken(newUser, 201, res);
});

// Login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }
  if (!user.isActive) {
    return next(new AppError("You Are Banned", 401)); // Blocked user
  }

  // 3) If everything is ok, send token to client
  createSendToken(user, 200, res);
});

// Protect routes
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  req.user = currentUser;
  next();
});

// Restrict access to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

// Check if the user is logged in
exports.isLogin = catchAsync(async (req, res, next) => {
  const token = req.cookies.jwt;

  if (token === "loggedout" || token === undefined) {
    return res.status(200).json({ isAuthenticated: false });
  }

  return res.json({ isAuthenticated: true });
});

// Forgot Password
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }

  const resetCode = Math.floor(10000 + Math.random() * 90000); // 5-digit code
  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetCode.toString())
    .digest("hex");
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiration

  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset code (valid for 10 minutes)",
      message: `Your password reset code is: ${resetCode}. If you did not request this, please ignore this email.`,
    });

    res.status(200).json({
      status: "success",
      message: "Reset code sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
});

// Verify the reset code
exports.checkCode = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }
  const Code = crypto
    .createHash("sha256")
    .update(req.body.code.toString())
    .digest("hex");

  if (!user.passwordResetExpires || user.passwordResetExpires < Date.now()) {
    return next(
      new AppError(
        "Your reset code has expired. Please request a new one.",
        400
      )
    );
  }

  if (user.passwordResetToken === Code) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({
      status: "success",
      message: "You can now reset your password",
    });
  } else {
    return next(new AppError("Code is invalid", 400));
  }
});

// Reset Password
exports.resetPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("Code is invalid or has expired", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  createSendToken(user, 200, res);
});

// Reset password while logged in
exports.resetPasswordinLoggin = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.user.email }).select(
    "+password"
  );

  if (!user) {
    return next(new AppError("User not found.", 404));
  }

  const isCurrentPasswordCorrect = await user.correctPassword(
    req.body.currentPassword,
    user.password
  );

  if (!isCurrentPasswordCorrect) {
    return next(new AppError("Your current password is wrong.", 400));
  }

  const isSamePassword = await user.correctPassword(
    req.body.newPassword,
    user.password
  );
  if (isSamePassword) {
    return next(
      new AppError("New password cannot be the same as the old password.", 400)
    );
  }

  user.password = req.body.newPassword;

  await user.save();

  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 50 * 1000),
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true", // تنظیمات Secure
    sameSite: "None",
  });

  res.status(200).json({
    status: "success",
    message: "Password reset successfully. You have been logged out.",
  });
});

// Logout
exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000), // Set for a short duration
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true", // تنظیمات Secure
    sameSite: "None",
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

// Get current user
exports.getMe = catchAsync(async (req, res, next) => {
  const user = req.user; // User is already set in the request by the protect middleware

  if (!user) {
    return next(new AppError("User not found.", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});
