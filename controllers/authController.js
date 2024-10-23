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
    secure: true,
    //  process.env.NODE_ENV === "production", // فقط در حالت تولید امن است
    sameSite: "None",
    // process.env.NODE_ENV === "production" ? "None" : "Lax", // در حالت تولید نیاز به None است
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
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });
    createSendToken(newUser, 201, res);
  } catch (error) {
    // console.log(error);
  }
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
    // console.log(user.isActive);
    return next(new AppError("You Are Banned", 401)); // بلاک شده
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
exports.isLogin = catchAsync(async (req, res, next) => {
  const token = req.cookies.jwt; // توکن را از کوکی‌ها استخراج می‌کنیم

  if (token === "loggedout" || token === undefined) {
    // اگر توکنی وجود نداشت
    return res.status(200).json({ isAuthenticated: false });
  }

  // اطلاعات کاربر را به req.user اضافه می‌کنیم

  return res.json({ isAuthenticated: true });

  // در این حالت، نیازی به فراخوانی next() نیست
});

// Forgot Password - Sending a 5-digit code to email
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }
  // 2) Generate random 5-digit code
  const resetCode = Math.floor(10000 + Math.random() * 90000); // 5-digit code
  // console.log(resetCode);
  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetCode.toString())
    .digest("hex");
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiration

  await user.save({ validateBeforeSave: false });
  // 3) Send it to user's email

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset code (valid for 10  minutes)",
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
exports.checkCode = catchAsync(async (req, res, next) => {
  // پیدا کردن کاربر با استفاده از ایمیل
  const user = await User.findOne({ email: req.body.email });
  // بررسی اینکه کاربر وجود دارد یا خیر
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }
  const Code = crypto
    .createHash("sha256")
    .update(req.body.code.toString())
    .digest("hex");

  // بررسی اینکه آیا زمان اعتبار توکن گذشته است یا خیر
  if (!user.passwordResetExpires || user.passwordResetExpires < Date.now()) {
    return next(
      new AppError(
        "Your reset code has expired. Please request a new one.",
        400
      )
    );
  }
  // بررسی اینکه آیا کد وریفیکیشن صحیح است یا خیر
  if (user.passwordResetToken === Code) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({
      status: "success",
      message: "You can now reset your password",
    });
  } else {
    // اگر کد اشتباه باشد
    return next(new AppError("Code is invalid", 400));
  }
});

// Verify the reset code and reset the password
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Hash the provided code and find the user

  const user = await User.findOne({ email: req.body.email });

  // 2) If code is invalid or expired, return an error
  if (!user) {
    return next(new AppError("Code is invalid or has expired", 400));
  }
  // 3) Update the user's password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});
// Verify the reset code and reset the password
exports.resetPasswordinLoggin = catchAsync(async (req, res, next) => {
  // 1) Find the user based on the current logged-in user's email
  const user = await User.findOne({ email: req.user.email }).populate(
    "password"
  );

  // 2) If user is not found, return an error
  if (!user) {
    return next(new AppError("User not found.", 404));
  }

  // 3) Check if the current password is correct
  const isCurrentPasswordCorrect = await user.correctPassword(
    req.body.currentPassword,
    user.password
  );
  // لاگ وضعیت رمز عبور فعلی
  if (!isCurrentPasswordCorrect) {
    return next(new AppError("Your current password is wrong.", 400));
  }

  // 4) Check if the new password is the same as the current password
  const isSamePassword = await user.correctPassword(
    req.body.newPassword,
    user.password
  );
  if (isSamePassword) {
    return next(
      new AppError("New password cannot be the same as the old password.", 400)
    );
  }

  // 5) Update the user's password
  user.password = req.body.newPassword; // اعتبارسنجی رمز عبور در مدل کاربر انجام می‌شود

  await user.save();

  // 6) Log the user out by setting a cookie
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 50 * 1000),
    httpOnly: true,
    secure: true,
    //  process.env.NODE_ENV === "production", // فقط در حالت تولید امن است
    sameSite: "None",
  });

  // 7) Send success response
  res.status(200).json({
    status: "success",
    message: "Password reset successfully. You have been logged out.",
  });
});

/**
 * Logout - Delete the JWT cookie from the user's browser
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
exports.logout = (req, res) => {
  // کوکی را با نام jwt حذف می‌کنیم و همه تنظیمات مشابه با کوکی اصلی را استفاده می‌کنیم
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: true,
    //  process.env.NODE_ENV === "production", // فقط در حالت تولید امن است
    sameSite: "None",
    // process.env.NODE_ENV === "production" ? "None" : "Lax", // در حالت تولید نیاز به None است
  };
  res.status(200).cookie("jwt", "LogOut!", cookieOptions);
};

// Get current user
exports.getMe = catchAsync(async (req, res, next) => {
  // Check if the user exists in the request
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
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) مطمئن شو که کاربر نمی‌خواهد پسورد خود را آپدیت کند
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }

  // 2) فیلدهای قابل آپدیت را فیلتر می‌کنیم
  const filteredBody = {};
  const allowedFields = ["name", "email", "PhoneNumber", "address"];

  allowedFields.forEach((field) => {
    // اگر کاربر رشته خالی یا null ارسال کرد
    if (req.body[field] === "" || req.body[field] === null) {
      // بررسی اینکه آیا فیلد الزامی است
      if (field === "name" || field === "email") {
        return next(new AppError(`${field} is required.`, 400));
      }
      filteredBody[field] = "none"; // فیلد حذف شود
    } else if (req.body[field]) {
      filteredBody[field] = req.body[field]; // مقدار موجود را ذخیره می‌کنیم
    }
  });

  // 3) به‌روزرسانی اطلاعات کاربر
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, // کاربر به‌روزرسانی شده را برگرداند
    runValidators: true, // اعتبارسنجی فیلدها را انجام دهد
  });

  // 4) ارسال پاسخ به کاربر
  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});
