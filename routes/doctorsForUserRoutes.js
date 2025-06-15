// routes/doctorsForUserRoutes.js
const express = require("express");
const {
  getAllDoctors,
  getDoctorReviews,
  addReview,
  requestAppointment,
} = require("../controllers/DoctorsForUserController");
const authMiddleware = require("../middleware/auth"); // فرض بر JWT یا Passport

const router = express.Router();

// دریافت همه دکترها برای نمایش کارت‌ها
// GET /api/v1/doctors
router.get("/", getAllDoctors);

// دریافت نظرات یک دکتر
// GET /api/v1/doctors/:id/reviews
router.get("/:id/reviews", getDoctorReviews);

// ارسال نظر جدید (نیاز به احراز هویت)
// POST /api/v1/doctors/:id/reviews
router.post("/:id/reviews", authMiddleware.protect, addReview);

// درخواست نوبت به دکتر (نیاز به احراز هویت)
// POST /api/v1/doctors/:id/appointments
router.post("/:id/appointments", authMiddleware.protect, requestAppointment);

module.exports = router;
