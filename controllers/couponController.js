const Coupon = require("../models/couponModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// Get All Coupons
exports.getAllCoupons = catchAsync(async (req, res, next) => {
  const coupons = await Coupon.find();

  res.status(200).json({
    status: "success",
    results: coupons.length,
    data: {
      coupons,
    },
  });
});

// Get Single Coupon
exports.getCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.find({ code: req.params.id });

  if (!coupon) {
    return next(new AppError("No coupon found with that ID", 404));
  }
  // console.log(coupon[0].discount);
  res.status(200).json({
    status: "success",
    discount: coupon[0].discount,
  });
});

// Create New Coupon
exports.createCoupon = catchAsync(async (req, res, next) => {
  const newCoupon = await Coupon.create(req.body);
  res.status(201).json({
    status: "success",
    data: {
      coupon: newCoupon,
    },
  });
});

// Update Coupon
exports.updateCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!coupon) {
    return next(new AppError("No coupon found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      coupon,
    },
  });
});

// Delete Coupon
exports.deleteCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);

  if (!coupon) {
    return next(new AppError("No coupon found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
