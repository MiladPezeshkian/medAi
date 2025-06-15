// App.js
// Express application setup with security, performance, and routing middleware

const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");

const AppError = require("./utils/AppError");
const globalErrorHandler = require("./controllers/errorController");

// Import application routes
const userRoutes = require("./routes/userRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const aiRoutes = require("./routes/AiRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const userAppointmentRoutes = require("./routes/appointmentUserRoute");
const chatRoutes = require("./routes/chatsRoutes");
const docFuser = require("./routes/doctorsForUserRoutes");
const app = express();

// CORS configuration for REST endpoints
app.use(
  cors({
    origin: ["http://localhost:3000", "https://medailw.netlify.app/"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors()); // enable preflight

// Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// Security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiting for chat routes
const chatLimiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api/v1/chat", chatLimiter);

// Body parser: reading JSON bodies into req.body
app.use(express.json({ limit: "10kb" }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL injection
app.use(mongoSanitize());
// Data sanitization against XSS
app.use(xss());

// Compression
app.use(compression());

// Mount application routes
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/user", aiRoutes);
app.use("/api/v1/doctor", doctorRoutes);
app.use("/api/v1/doctor/appointment", appointmentRoutes);
app.use("/api/v1/user/appointment", userAppointmentRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/doctorsforuser", docFuser);
// Root route
app.get("/", (req, res) => {
  res.send("Hello, welcome to the API!");
});

// Allow Socket.IO handshake polling and upgrades
app.all("/socket.io/*", (req, res, next) => next());

// Handle unknown routes
app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

module.exports = app;
