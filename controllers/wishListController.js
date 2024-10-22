const User = require("../models/UserModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// گرفتن ویش‌لیست کاربر
exports.getAllWishlist = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("wishList");
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      wishList: user.wishList,
    },
  });
});

// اضافه کردن محصولات جدید به ویش‌لیست کاربر
exports.setAllWishlist = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const wishlist = req.body.wishlist; // ویش‌لیست جدید از بدنه درخواست
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // به‌روزرسانی ویش‌لیست بدون نیاز به دو بار سیو کردن
  try {
    user.wishList = wishlist;
    await user.save();
  } catch (e) {
    console.log("Error occurred while updating wishlist:", e);
    return next(new AppError("Wishlist update failed", 500));
  }

  res.status(200).json({
    status: "success",
    message: "Wishlist updated successfully",
    data: {
      wishList: user.wishList,
    },
  });
});
