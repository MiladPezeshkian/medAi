const express = require("express");
const {
  submitContactForm,
  getAllContactMessages,
  SendMessage,
} = require("../controllers/contactUsController");
const router = express.Router();
const authController = require("../controllers/authController");

// ارسال پیام Contact Us
router.post("/", submitContactForm);

// دریافت تمام پیام‌های Contact Us
router.get(
  "/messages",
  authController.protect,
  authController.restrictTo("admin", "manager"),
  getAllContactMessages
);
router.post(
  "/sendMessage",
  authController.protect,
  authController.restrictTo("admin", "manager"),
  SendMessage
);

module.exports = router;
