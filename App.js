const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const AppError = require("./utils/AppError");
const globalErrorHandler = require("./controllers/errorController");
const apikey = require("./routes/apiKeyRoutes");
const compression = require("compression");
// Import Routes
const authRoutes = require("./routes/authRoutes");
const contactUsRoutes = require("./routes/contactUsRoutes");
const wishList = require("./routes/wishListRoute");
const product = require("./routes/productRoutes");
const orders = require("./routes/orderRoutes");
const app = express();
const users = require("./routes/userRoutes");
const coupon = require("./routes/couponRoutes");
app.use("/uploads", express.static("uploads"));

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limit requests from the same API
const limiter = rateLimit({
  max: 100, // حداکثر درخواست‌ها
  windowMs: 60 * 60 * 1000, // 100 requests per hour (یک ساعت)
  message: "Too many requests from this IP, please try again in an hour!",
});
// app.use("/api", limiter);
app.use(compression());
// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS (cross-site scripting attacks)
app.use(xss());
app.options(
  "*",
  cors({
    origin: "http://localhost:5173", // یا دامنه صحیح کلاینت شما
    credentials: true,
  })
);

// Implement CORS for frontend access

// Routes mounting
app.use("/api/v1/auth", authRoutes); // Authentication routes
app.use("/api/v1/wishlist", wishList); // Wishlist routes
app.use("/api/v1/contact", contactUsRoutes); // Contact Us routes
app.use("/api/v1/products", product); // Product routes
app.use("/api/v1/orders", orders); // Orders routes
app.use("/api/v1/apikey", apikey); // Orders routes
app.use("/api/v1/users", users);
app.use("/api/v1/coupons", coupon);
// Handle unhandled routes
app.get("/", (req, res) => {
  res.send("سلام، خوش آمدید!");
});
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

module.exports = app;
