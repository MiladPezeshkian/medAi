const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Doctor = require("../models/DoctorModel"); // Doctor model
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const sendEmail = require("../utils/email");
const { promisify } = require("util");

// -----------------------
// Helper: sign JWT token
// -----------------------
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// ---------------------------
// Helper: send JWT as cookie
// ---------------------------
const createSendToken = (doctor, statusCode, res) => {
  const token = signToken(doctor._id);

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
  doctor.password = undefined;
  doctor.passwordResetToken = undefined;
  doctor.passwordResetExpires = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user: doctor,
    },
  });
};

// ------------------
// Doctor Signup
// ------------------
exports.signup = catchAsync(async (req, res, next) => {
  const {
    name,
    gender,
    dateOfBirth,
    email,
    password,
    passwordConfirm,
    licenseNumber,
    specialty,
    bio,
    ratePerConsultation,
  } = req.body;

  // Validate required doctor fields
  if (!licenseNumber || !specialty || !bio || !ratePerConsultation) {
    return next(
      new AppError(
        "Please provide licenseNumber, specialty, bio, and consultationFee.",
        400
      )
    );
  }

  // 1) Create new doctor
  const newDoctor = await Doctor.create({
    name,
    gender,
    dateOfBirth,
    email,
    password,
    passwordConfirm,
    role: "doctor",
    licenseNumber,
    specialty,
    bio,
    ratePerConsultation,
  });

  // 2) Send token
  createSendToken(newDoctor, 201, res);
});

// ------------------
// Doctor Login
// ------------------
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email & password provided
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  // 2) Find doctor & validate password
  const doctor = await Doctor.findOne({ email }).select("+password");
  if (
    !doctor ||
    !(await doctor.correctPassword(password, doctor.password)) ||
    doctor.role !== "doctor"
  ) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) Check if active
  if (!doctor.isActive) {
    return next(new AppError("Your account has been deactivated.", 401));
  }

  // 4) Send token
  createSendToken(doctor, 200, res);
});

// --------------------
// Protect (for Doctor)
// --------------------
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

  // 2) Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check doctor still exists
  const currentDoctor = await Doctor.findById(decoded.id);
  if (!currentDoctor) {
    return next(
      new AppError("The doctor belonging to this token no longer exists.", 401)
    );
  }

  // 4) Check if password changed after token issued
  if (currentDoctor.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("Password changed recently! Please log in again.", 401)
    );
  }

  // 5) Grant access
  req.user = currentDoctor;
  next();
});

// ----------------------
// Restrict to Doctor
// ----------------------
exports.restrictToDoctor = (...roles) => {
  return (req, res, next) => {
    if (req.user.role !== "doctor") {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

// ---------------------
// Forgot Password (Doctor)
// ---------------------
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const doctor = await Doctor.findOne({ email: req.body.email });
  if (!doctor) {
    return next(new AppError("No doctor found with that email address.", 404));
  }

  const resetCode = Math.floor(10000 + Math.random() * 90000).toString();
  doctor.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");
  doctor.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  await doctor.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      email: doctor.email,
      subject: "MedAI – Your password reset code (valid for 10 minutes)",
      message: `Your password reset code is: ${resetCode}. If you did not request this, please ignore.`,
    });

    res.status(200).json({
      status: "success",
      message: "Reset code sent to email!",
    });
  } catch (err) {
    doctor.passwordResetToken = undefined;
    doctor.passwordResetExpires = undefined;
    await doctor.save({ validateBeforeSave: false });
    return next(
      new AppError("Error sending email. Please try again later.", 500)
    );
  }
});

// ---------------------------
// Check Reset Code (Doctor)
// ---------------------------
exports.checkResetCode = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;
  const doctor = await Doctor.findOne({ email });
  if (!doctor) {
    return next(new AppError("No doctor found with that email address.", 404));
  }

  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  if (
    !doctor.passwordResetToken ||
    doctor.passwordResetToken !== hashedCode ||
    doctor.passwordResetExpires < Date.now()
  ) {
    return next(new AppError("Code is invalid or has expired.", 400));
  }

  doctor.passwordResetToken = undefined;
  doctor.passwordResetExpires = undefined;
  await doctor.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "Code verified. You can now reset your password.",
  });
});

// ------------------------
// Reset Password (Doctor)
// ------------------------
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, newPassword, newPasswordConfirm } = req.body;
  const doctor = await Doctor.findOne({ email }).select("+password");
  if (!doctor) {
    return next(new AppError("No doctor found with that email address.", 404));
  }

  doctor.password = newPassword;
  doctor.passwordConfirm = newPasswordConfirm;
  await doctor.save();

  createSendToken(doctor, 200, res);
});

// --------------------------
// Update Password (Doctor)
// --------------------------
exports.updateMyPassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;
  const doctor = await Doctor.findById(req.user.id).select("+password");

  if (!(await doctor.correctPassword(currentPassword, doctor.password))) {
    return next(new AppError("Your current password is incorrect.", 401));
  }
  if (currentPassword === newPassword) {
    return next(
      new AppError("New password cannot be the same as the old password.", 400)
    );
  }

  doctor.password = newPassword;
  doctor.passwordConfirm = newPasswordConfirm;
  await doctor.save();

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

// ----------------
// Logout (Doctor)
// ----------------
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
// Get Current Doctor
// ----------------------
exports.getMe = catchAsync(async (req, res, next) => {
  const doctor = req.user;
  if (!doctor) {
    return next(new AppError("Doctor not found.", 404));
  }
  res.status(200).json({
    status: "success",
    data: { doctor },
  });
});
// ----------------------
// Update Doctor Profile
// ----------------------
exports.updateMe = catchAsync(async (req, res, next) => {
  // Prevent password changes here
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }
  console.log(req.body);
  // Filter allowed fields
  const allowedFields = [
    "name",
    "email",
    "gender",
    "dateOfBirth",
    "phoneNumber",
    "address",
    "specialty",
    "bio",
    "ratePerConsultation",
    "contactInfo",
  ];
  const filteredBody = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) filteredBody[field] = req.body[field];
  });
  console.log(filteredBody);
  const updatedDoctor = await Doctor.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: "success",
    data: {
      doctor: updatedDoctor,
    },
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
