const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/UserModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const sendEmail = require("../utils/email");
const { promisify } = require("util");

// Helper: sign JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// Helper: send JWT in cookie & response
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  };
  res.cookie("jwt", token, cookieOptions);

  // Remove sensitive fields
  user.password = undefined;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

// ----------------------
// Signup (Patient Only)
// ----------------------
exports.signup = catchAsync(async (req, res, next) => {
  const { name, gender, dateOfBirth, email, password, passwordConfirm } =
    req.body;

  const newUser = await User.create({
    name: name,
    gender: gender,
    dateOfBirth: dateOfBirth,
    email: email,
    password: password,
    passwordConfirm: passwordConfirm,
    role: "patient",
  });

  createSendToken(newUser, 201, res);
});

// ----------------------
// Login (Patient Only)
// ----------------------
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError("Please provide email and password.", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (
    !user ||
    !(await user.correctPassword(password, user.password)) ||
    user.role !== "patient"
  ) {
    return next(new AppError("Incorrect email or password.", 401));
  }
  if (!user.isActive) {
    return next(new AppError("Your account is deactivated.", 401));
  }

  createSendToken(user, 200, res);
});

// ----------------------
// Protect Routes
// ----------------------
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(new AppError("Please log in to access this route.", 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError("User no longer exists with this token.", 401));
  }
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("Password was changed recently. Please log in again.", 401)
    );
  }

  req.user = currentUser;
  next();
});

// ----------------------
// Restrict to Patients
// ----------------------
exports.restrictToPatient = (req, res, next) => {
  if (req.user.role !== "patient") {
    return next(
      new AppError("You do not have permission to perform this action.", 403)
    );
  }
  next();
};

// --------------------------
// Forgot Password (Code)
// --------------------------
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("No user found with that email address.", 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      email: user.email,
      subject: "MedAI Password Reset Code (10 min valid)",
      message: `Your reset code is: ${resetToken}`,
    });

    res.status(200).json({
      status: "success",
      message: "Reset code sent to email.",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("Error sending email. Please try again later.", 500)
    );
  }
});

// -------------------------
// Verify Reset Code
// -------------------------
exports.verifyResetCode = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email }).select(
    "+passwordResetToken +passwordResetExpires"
  );
  if (
    !user ||
    user.passwordResetToken !==
      crypto.createHash("sha256").update(code).digest("hex") ||
    user.passwordResetExpires < Date.now()
  ) {
    return next(new AppError("Code is invalid or has expired.", 400));
  }

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "Code verified. You may reset your password.",
  });
});

// ----------------------
// Reset Password
// ----------------------
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, newPassword, newPasswordConfirm } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new AppError("User not found.", 404));
  }

  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});

// --------------------------
// Update Password (Auth’d)
// --------------------------
exports.updateMyPassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError("Current password is incorrect.", 401));
  }
  if (currentPassword === newPassword) {
    return next(
      new AppError("New password must differ from current password.", 400)
    );
  }

  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;
  await user.save();

  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  });

  res.status(200).json({
    status: "success",
    message: "Password updated. Please log in again.",
  });
});

// ----------------------
// Logout
// ----------------------
exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  });
  res.status(200).json({ status: "success" });
};

// ----------------------
// Get Current User
// ----------------------
exports.getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: { user: req.user },
  });
});

// ----------------------
// Update Profile
// ----------------------
exports.updateMe = catchAsync(async (req, res, next) => {
  // Disallow password fields
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError("Use /updateMyPassword to change your password.", 400)
    );
  }

  const allowed = [
    "name",
    "email",
    "gender",
    "dateOfBirth",
    "phoneNumber",
    "address",
    "medicalRecord",
  ];
  const filtered = {};
  Object.keys(req.body).forEach((key) => {
    if (allowed.includes(key)) filtered[key] = req.body[key];
  });

  const updated = await User.findByIdAndUpdate(req.user.id, filtered, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: { user: updated },
  });
});
exports.isLogin = catchAsync(async (req, res, next) => {
  const token = req.cookies ? req.cookies.jwt : undefined;
  if (!token || token === "loggedout") {
    return res.status(200).json({ isAuthenticated: false });
  }
  return res.json({ isAuthenticated: true });
});
exports.logout = (req, res, next) => {
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  };
  res.cookie("jwt", "loggedout", cookieOptions);
  res.status(200).json({ status: "success" });
};
