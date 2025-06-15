// models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "senderModel",
    },
    senderModel: {
      type: String,
      required: true,
      enum: ["Doctor", "User"], // یا نام دقیق مدل‌هات
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "receiverModel",
    },
    receiverModel: {
      type: String,
      required: true,
      enum: ["Doctor", "User"],
    },

    content: { type: String, trim: true, default: "" },
    messageType: {
      type: String,
      enum: ["text", "file", "video"],
      default: "text",
    },
    attachments: [{ fileUrl: String, fileType: String, fileName: String }],
    isRead: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("Message", messageSchema);
