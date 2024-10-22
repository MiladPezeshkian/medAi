const Order = require("../models/OrderModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
// import Product from "../../Client/src/components/Product";
// گرفتن سفارش‌های کاربر وارد شده
exports.getMyOrders = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const filter = req.query.filter || "all"; // فیلتر پیش‌فرض "همه"
  // فیلتر بر اساس وضعیت تحویل
  let query = { user: userId };
  if (filter === "delivered") {
    query.isDelivered = true;
  } else if (filter === "not-delivered") {
    query.isDelivered = false;
  }

  // پیدا کردن سفارش‌ها با توجه به فیلتر اعمال شده
  const orders = await Order.find(query);

  if (!orders || orders.length === 0) {
    return next(new AppError("No orders found for this user", 404));
  }

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: {
      orders,
    },
  });
});

// گرفتن همه سفارش‌ها (برای ادمین)
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find()
    .populate("user")
    .populate("orderItems.product");

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: {
      orders,
    },
  });
});

// گرفتن یک سفارش خاص بر اساس ID
exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate("user")
    .populate("orderItems.product");

  if (!order) {
    return next(new AppError("No order found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      order,
    },
  });
});

// ایجاد یک سفارش جدید
exports.createOrder = catchAsync(async (req, res, next) => {
  const {
    orderItems,
    paymentMethod,
    discount = 0,
    user,
    totalPrice,
    shippingAddress,
  } = req.body;

  const isPaid = paymentMethod === "online";
  let paidAt = null;
  if (isPaid) {
    paidAt = Date.now();
  }

  const newOrder = await Order.create({
    user,
    orderItems,
    totalPrice: totalPrice - (totalPrice * discount) / 100,
    discount,
    paymentMethod,
    isPaid,
    paidAt,
    shippingAddress,
  });

  res.status(201).json({
    status: "success",
    data: {
      order: newOrder,
    },
  });
});

// بروزرسانی یک سفارش
exports.updateOrder = catchAsync(async (req, res, next) => {
  const { orderItems, discount = 0 } = req.body;

  if (orderItems) {
    const totalPrice = orderItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    req.body.totalPrice = totalPrice - (totalPrice * discount) / 100;
  }
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!order) {
    return next(new AppError("No order found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      order,
    },
  });
});

// حذف یک سفارش
exports.deleteOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) {
    return next(new AppError("No order found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
exports.getAllOrders2 = catchAsync(async (req, res, next) => {
  const orders = await Order.find().populate(
    "orderItems.product",
    "title image price"
  );
  if (!orders) {
    return next(new AppError("No orders found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      orders,
    },
  });
});
