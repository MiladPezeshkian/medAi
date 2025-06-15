// controllers/chatController.js

// Imports
const Conversation = require("../models/Conversation");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const Message = require("../models/Message");
/**
 * @desc    Get all conversations for a specific user (either doctor or patient)
 * @route   GET /api/v1/chat/my-conversations/:userId
 * @access  Private (doctor or patient)
 */
exports.getMyConversations = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;

  if (!userId) {
    return next(new AppError("User ID is required", 400));
  }

  const conversations = await Conversation.find({
    $or: [{ doctorId: userId }, { patientId: userId }],
  })
    .populate("doctorId", "_id name avatar")
    .populate("patientId", "_id name avatar")
    .populate("appointmentId", "date time")
    .sort({ updatedAt: -1 });

  res.status(200).json(conversations);
});

// controllers/chatController.js
/*
 * @desc    Get all messages for a specific conversation
 * @route   GET /api/v1/chat/messages/:conversationId
 * @access  Private (doctor or patient involved in conversation)
 */
exports.getMessagesByConversationId = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;

  if (!conversationId) {
    return next(new AppError("Conversation ID is required", 400));
  }
  const messages = await Message.find({ conversation: conversationId })
    .populate({ path: "sender", select: "name avatar" })
    .populate({ path: "receiver", select: "name avatar" })
    .sort({ sentAt: 1 }); // oldest to newest

  if (!messages) {
    return next(new AppError("No messages found", 404));
  }

  res.status(200).json(messages);
});
// فرض می‌کنیم ریکوئست شامل:
// conversationId, senderId, receiverId, content (متن اختیاری)
// و فایل PDF در فیلد 'file' آپلود شده

exports.sendFileMessage = catchAsync(async (req, res, next) => {
  const { conversationId, senderId, receiverId, content } = req.body;

  if (!req.file) {
    return next(new AppError("File PDF is required", 400));
  }

  if (!conversationId || !senderId || !receiverId) {
    return next(
      new AppError("conversationId, senderId and receiverId are required", 400)
    );
  }

  const newMessage = await Message.create({
    conversation: conversationId,
    sender: senderId,
    receiver: receiverId,
    content: content || "",
    messageType: "file",
    attachments: [
      {
        fileUrl: req.file.path, // مسیر فایل ذخیره شده در سرور
        fileType: req.file.mimetype,
        fileName: req.file.originalname,
      },
    ],
  });

  res.status(201).json({
    message: "File message sent successfully",
    data: newMessage,
  });
});
