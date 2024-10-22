const ContactUs = require("../models/ContactUs");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/email");

// Contact Us controller: دریافت و ذخیره پیام تماس کاربران
exports.submitContactForm = catchAsync(async (req, res, next) => {
  const { name, email, phone, message } = req.body;

  // بررسی اینکه همه فیلدهای ضروری پر شده باشند
  if (!name || !email || !message) {
    return next(
      new AppError(
        "All fields are required. Please provide your name, email, and message.",
        400
      )
    );
  }

  // ذخیره پیام تماس در دیتابیس
  const newContact = await ContactUs.create({ name, email, phone, message });

  // ارسال پاسخ موفقیت به کاربر
  res.status(201).json({
    success: true,
    message: "Thank you for contacting us! We will get back to you soon.",
  });
});

// گرفتن همه پیام‌های تماس
exports.getAllContactMessages = catchAsync(async (req, res, next) => {
  const messages = await ContactUs.find();

  if (!messages || messages.length === 0) {
    return next(new AppError("No contact messages found", 404));
  }

  res.status(200).json({
    status: "success",
    data: messages,
  });
});

// ارسال پاسخ به کاربر از طریق ایمیل
exports.SendMessage = catchAsync(async (req, res, next) => {
  const { email, message } = req.body;
  // console.log(email, message);
  // بررسی ورودی‌ها
  if (!email || !message) {
    return next(new AppError("Email and message are required", 400));
  }

  // ارسال ایمیل به کاربر
  await sendEmail({
    email,
    subject: "KurdShop - We received your message",
    message,
  });

  // پاسخ موفقیت
  res.status(200).json({
    status: "success",
    message: "Your message has been successfully sent!",
  });
});
