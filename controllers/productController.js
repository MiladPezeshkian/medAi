const Product = require("../models/ProductModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
exports.getAllComments = catchAsync(async (req, res, next) => {
  // پیدا کردن تمامی محصولات و استخراج نظرات آنها

  const allComments = await Product.find().select("reviews");

  if (!allComments || allComments.length === 0) {
    return next(new AppError("No comments found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      reviews: allComments.flatMap((product) => product.reviews), // ترکیب همه نظرات در یک آرایه
    },
  });
});
// Get All Products
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const products = await Product.find();
  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
    },
  });
});

// Get Single Product
exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

// Create New Product
exports.createProduct = catchAsync(async (req, res, next) => {
  const { title, price, category, description } = req.body;

  // اگر تصویری آپلود شده باشد، مسیر آن را ذخیره کنید
  const imagePath = req.file ? req.file.path : null;
  // ساخت محصول جدید
  const newProduct = new Product({
    title,
    price,
    category,
    description,
    image: imagePath, // ذخیره مسیر فایل در دیتابیس
  });
  await newProduct.save();

  res.status(201).json({
    status: "success",
    data: {
      product: newProduct,
    },
  });
});
// Update Product
exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

// Delete Product
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.addReview = catchAsync(async (req, res, next) => {
  const { productId, rating, review } = req.body;

  // بررسی اینکه کاربر نظر داده است
  if (!rating || !review) {
    return next(new AppError("Please provide a rating and a review", 400));
  }

  // پیدا کردن محصول
  const product = await Product.findById(productId);

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // بررسی اینکه آیا کاربر قبلا نظری داده است
  const existingReview = product.reviews.find(
    (r) => r.user.toString() === req.user.id
  );

  if (existingReview) {
    return next(new AppError("You have already reviewed this product", 400));
  }
  // ساخت نظر جدید
  const newReview = {
    user: req.user.id,
    name: req.user.name,
    review,
    rating,
  };

  // اضافه کردن نظر جدید به محصول
  product.addReview(newReview);

  // ذخیره محصول
  // await product.save();
  res.status(201).json({
    status: "success",
    data: {
      product,
    },
  });
});

exports.getComments = catchAsync(async (req, res, next) => {
  const productId = req.params.id;

  // پیدا کردن نظر های محصول
  const productComments = await Product.findById(productId).select("reviews");
  if (!productComments) {
    next(new AppError("No product found with that ID", 404));
  }

  res.status(200).json({ productComments });
});
exports.updateComment = catchAsync(async (req, res, next) => {
  const { reviewId, reviewText, rating } = req.body;
  // به‌روزرسانی نظر با استفاده از reviewId
  console.log(reviewId, reviewText, rating);
  const product = await Product.findOneAndUpdate(
    { "reviews._id": reviewId },
    {
      $set: {
        "reviews.$.review": reviewText,
        "reviews.$.rating": rating,
      },
    },
    { new: true, runValidators: true }
  );

  if (!product) {
    return next(new AppError("No review found with that ID", 404));
  }

  // به‌روزرسانی میانگین امتیازات
  await product.calcAverageRatings();

  const updatedReview = product.reviews.id(reviewId);

  res.status(200).json({
    status: "success",
    data: {
      review: updatedReview,
    },
  });
});
exports.DeleteComment = catchAsync(async (req, res, next) => {
  const { reviewId } = req.body;
  // به‌روزرسانی نظر با استفاده از reviewId

  await Product.findOneAndDelete({ "reviews._id": reviewId });

  //

  res.status(200).json({
    status: "success",
  });
});
exports.UserComments = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  // پیدا کردن تمام محصولاتی که شامل کامنت‌های کاربر مورد نظر هستند
  const products = await Product.find({ "reviews.user": userId }).select(
    "reviews"
  );

  // استخراج کامنت‌های کاربر از محصولات پیدا شده
  const userComments = products.flatMap((product) =>
    product.reviews.filter((review) => review.user.toString() === userId)
  );

  if (userComments.length === 0) {
    return next(new AppError("No comments found for this user", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      comments: userComments,
    },
  });
});
