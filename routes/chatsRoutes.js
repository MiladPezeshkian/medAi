// routes/chatRoutes.js

const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
// Correctly import your auth middleware
const protectEither = require("../middleware/auth");
// Ensure uploadPdf comes from the Multer middleware file
const uploadPdf = require("../utils/fileUpload");

router.use(protectEither.protect);

router.get("/my-conversations/:userId", chatController.getMyConversations);

router.get(
  "/messages/:conversationId",
  chatController.getMessagesByConversationId
);

router.post(
  "/send-file-message",
  uploadPdf.single("file"),
  chatController.sendFileMessage
);

module.exports = router;
