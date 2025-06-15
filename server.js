const mongoose = require("mongoose");
const dotenv = require("dotenv");
const http = require("http");
const jwt = require("jsonwebtoken");

const app = require("./App");
const socketInit = require("./sockets/chat");

// 1️⃣ Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

// 2️⃣ Load environment variables
dotenv.config({ path: "./config.env" });

// Validate DB credentials
if (!process.env.DATABASE || !process.env.DATABASE_PASSWORD) {
  console.error(
    "Missing required environment variables: DATABASE or DATABASE_PASSWORD"
  );
  process.exit(1);
}

// 3️⃣ Connect to MongoDB
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);
mongoose.connect(DB).then(() => console.log("DB connection successful!"));
//localhost !
// const DB_LOCAL = process.env.DATABASE_LOCAL;
// mongoose.connect(DB_LOCAL).then(() => console.log("DB conecting !"));
// 4️⃣ Create HTTP server & configure Socket.IO
const port = process.env.PORT || 50000;
const server = http.createServer(app);
const { Server } = require("socket.io");

const allowedOrigins = [
  "http://localhost:3000",
  "https://medailw.netlify.app/",
];
if (process.env.NODE_ENV === "production" && process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// 5️⃣ Authenticate Socket.IO connections
io.use((socket, next) => {
  const { token } = socket.handshake.auth;
  if (!token) return next(new Error("Authentication error: No token provided"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error(`Authentication error: ${err.message}`));
  }
});

// 6️⃣ Log connection errors
io.on("connection_error", (err) =>
  console.error("Socket connection error:", err)
);

// 7️⃣ Initialize chat sockets
socketInit(io);

// 8️⃣ Start server
server.listen(port, () => console.log(`Server running on port ${port}`));

// 9️⃣ Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  server.close(() => process.exit(1));
});

// 🔟 Graceful shutdown on SIGTERMs
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  io.close(() => console.log("Socket.IO connections closed."));
  server.close(() =>
    mongoose.connection.close(() => console.log("MongoDB connection closed."))
  );
});
