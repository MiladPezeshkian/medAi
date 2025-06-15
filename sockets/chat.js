// sockets/chat.js
// This module initializes chat-related Socket.io events, handling user connections,
// conversation room management, message exchange, and database persistence.

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

/**
 * Initialize chat socket handlers
 * @param {import('socket.io').Server} io - Socket.io server instance
 */
module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    /**
     * Join a user to a conversation room
     * @event joinConversation
     * @param {Object} data
     * @param {string} data.conversationId - ID of the conversation room
     * @param {string} data.userId - ID of the user joining
     */
    socket.on("joinConversation", async ({ conversationId, userId }) => {
      try {
        if (!conversationId || !userId) {
          return socket.emit("error", "Invalid input data");
        }

        const conversation = await Conversation.findById(conversationId).select(
          "isClosed doctorId patientId"
        );

        if (!conversation) {
          return socket.emit("error", "Conversation not found");
        }

        if (conversation.isClosed) {
          return socket.emit("error", "Conversation is closed");
        }

        const isParticipant =
          conversation.doctorId.equals(userId) ||
          conversation.patientId.equals(userId);
        if (!isParticipant) {
          return socket.emit("error", "Access denied");
        }

        socket.join(conversationId);
        socket.emit("joined", conversationId);
        console.log(`✅ User ${userId} joined conversation ${conversationId}`);
      } catch (err) {
        console.error(`Error in joinConversation: ${err.message}`);
        socket.emit("error", "Server error during join");
      }
    });

    /**
     * Handle incoming messages and broadcast to room
     * @event sendMessage
     * @param {Object} data
     * @param {string} data.conversationId - ID of the conversation
     * @param {string} data.sender - ID of the sender
     * @param {string} data.receiver - ID of the receiver
     * @param {string} data.content - Message text
     * @param {string} [data.messageType=text] - Type of message (text, file, video)
     * @param {Array} [data.attachments=[]] - Attachment objects
     */
    socket.on(
      "sendMessage",
      async ({
        conversationId,
        sender,
        receiver,
        content,
        messageType = "text",
        attachments = [],
      }) => {
        try {
          if (!conversationId || !sender || !receiver || !content) {
            return socket.emit("error", "Invalid input data");
          }

          const conversation = await Conversation.findById(
            conversationId
          ).select("isClosed doctorId patientId");

          if (!conversation) {
            return socket.emit("error", "Conversation not found");
          }

          if (conversation.isClosed) {
            return socket.emit("error", "Conversation is closed");
          }

          // Determine senderModel and receiverModel based on conversation participants
          const senderModel = conversation.doctorId.equals(sender)
            ? "Doctor"
            : "User";
          const receiverModel = conversation.doctorId.equals(receiver)
            ? "Doctor"
            : "User";

          // Persist message to database including dynamic references
          const savedMessage = await Message.create({
            conversation: conversationId,
            sender,
            senderModel,
            receiver,
            receiverModel,
            content,
            messageType,
            attachments,
          });

          // Broadcast the saved message to all clients in the room
          io.to(conversationId).emit("newMessage", savedMessage);
          console.log(
            `📨 Message saved and broadcast in ${conversationId} by ${sender}`
          );
        } catch (err) {
          console.error(`Error in sendMessage: ${err.message}`);
          socket.emit("error", "Server error during message send");
        }
      }
    );

    /**
     * Handle socket disconnection
     */
    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};
