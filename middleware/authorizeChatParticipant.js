const Conversation = require("../models/Conversation");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const authorizeChatParticipant = async (req, res, next) => {
  const requestId = uuidv4();
  console.log(
    `[INFO] [${new Date().toISOString()}] [Request ID: ${requestId}] Starting authorization check for conversation`
  );

  // گرفتن توکن از هدر Authorization
  const authHeader = req.headers.authorization;
  console.log(
    `[DEBUG] [${new Date().toISOString()}] [Request ID: ${requestId}] Authorization header: ${
      authHeader || "Not provided"
    }`
  );

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error(
      `[ERROR] [${new Date().toISOString()}] [Request ID: ${requestId}] No valid Bearer token provided`
    );
    return res
      .status(401)
      .json({ message: "Unauthorized: No valid token provided" });
  }

  const token = authHeader.split(" ")[1];
  console.log(
    `[DEBUG] [${new Date().toISOString()}] [Request ID: ${requestId}] Extracted JWT token: ${token.substring(
      0,
      10
    )}...`
  );

  // دی‌کد کردن توکن
  let decoded;
  try {
    console.log(
      `[INFO] [${new Date().toISOString()}] [Request ID: ${requestId}] Decoding JWT token`
    );
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(
      `[DEBUG] [${new Date().toISOString()}] [Request ID: ${requestId}] Decoded token payload:`,
      decoded
    );
  } catch (err) {
    console.error(
      `[ERROR] [${new Date().toISOString()}] [Request ID: ${requestId}] JWT decode failed: ${
        err.message
      }`
    );
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }

  // گرفتن id از توکن دی‌کدشده (به جای userId)
  const userId = decoded.id;
  if (!userId) {
    console.error(
      `[ERROR] [${new Date().toISOString()}] [Request ID: ${requestId}] No id found in token payload`
    );
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid token payload" });
  }
  console.log(
    `[INFO] [${new Date().toISOString()}] [Request ID: ${requestId}] Extracted userId: ${userId}`
  );

  // گرفتن conversationId
  const conversationId = req.params.conversationId || req.body.conversationId;
  console.log(
    `[DEBUG] [${new Date().toISOString()}] [Request ID: ${requestId}] Conversation ID: ${conversationId}`
  );

  if (!conversationId) {
    console.error(
      `[ERROR] [${new Date().toISOString()}] [Request ID: ${requestId}] Conversation ID is missing`
    );
    return res.status(400).json({ message: "Conversation ID is required" });
  }

  try {
    console.log(
      `[INFO] [${new Date().toISOString()}] [Request ID: ${requestId}] Fetching conversation from database with ID: ${conversationId}`
    );
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      console.error(
        `[ERROR] [${new Date().toISOString()}] [Request ID: ${requestId}] Conversation not found for ID: ${conversationId}`
      );
      return res.status(404).json({ message: "Conversation not found" });
    }

    console.log(
      `[DEBUG] [${new Date().toISOString()}] [Request ID: ${requestId}] Conversation fetched:`,
      {
        _id: conversation._id,
        doctorId: conversation.doctorId?.toString(),
        patientId: conversation.patientId?.toString(),
        appointmentId: conversation.appointmentId?.toString(),
        isClosed: conversation.isClosed,
        createdAt: conversation.createdAt,
      }
    );

    // چک کردن وجود doctorId و patientId
    if (!conversation.doctorId || !conversation.patientId) {
      console.error(
        `[ERROR] [${new Date().toISOString()}] [Request ID: ${requestId}] Missing doctorId or patientId in conversation`
      );
      return res
        .status(400)
        .json({ message: "Conversation is missing doctor or patient" });
    }

    const doctorId = conversation.doctorId.toString();
    const patientId = conversation.patientId.toString();
    console.log(
      `[DEBUG] [${new Date().toISOString()}] [Request ID: ${requestId}] Comparing userId: ${userId} with doctorId: ${doctorId} and patientId: ${patientId}`
    );

    if (userId !== doctorId && userId !== patientId) {
      console.error(
        `[ERROR] [${new Date().toISOString()}] [Request ID: ${requestId}] Access denied for userId: ${userId}`
      );
      return res.status(403).json({ message: "Access denied" });
    }

    // ذخیره userId برای استفاده در middleware بعدی
    req.user = { _id: userId };
    console.log(
      `[INFO] [${new Date().toISOString()}] [Request ID: ${requestId}] Authorization successful for userId: ${userId}`
    );
    next();
  } catch (err) {
    console.error(
      `[ERROR] [${new Date().toISOString()}] [Request ID: ${requestId}] Authorization failed: ${
        err.message
      }`
    );
    return res
      .status(500)
      .json({ message: "Server error during authorization" });
  }
};

module.exports = authorizeChatParticipant;
