// routes/ai.js

const express = require("express");
const router = express.Router();
const {
  analyzeSymptoms,
  getAnalysisReportById,
  getAllUserReports,
  updatePublishStatus,
  getPublishedReportsWithUser,
} = require("../controllers/aiDiagnosisController");
const userAuth = require("../controllers/userAuthController");
const doctorAuth = require("../controllers/doctorAuthController");
/**
 * @route   POST /api/ai/analyze
 * @desc    تحلیل علائم بیمار و ذخیره در دیتابیس
 * @access  Private
 */
router.post("/analyze", analyzeSymptoms);

/**
 * @route   GET /api/ai/reports
 * @desc    دریافت تمام گزارش‌های هوش مصنوعی مربوط به کاربر
 * @access  Private
 */
// دریافت گزارش‌های شخصی برای کاربر لاگین‌شده
router.get("/my-reports", userAuth.protect, getAllUserReports);

// به‌روزرسانی وضعیت انتشار توسط کاربر روی گزارش خودش
router.patch("/updatePublishStatus", userAuth.protect, updatePublishStatus);

// فقط برای دکتر: دریافت گزارش‌های منتشرشده همراه با اطلاعات کاربر
router.get("/userReports", doctorAuth.protect, getPublishedReportsWithUser);

/**
 * @route   GET /api/ai/reports/:id
 * @desc    دریافت یک گزارش خاص با آیدی
 * @access  Private
 */
router.get("/reports/:id", getAnalysisReportById);

module.exports = router;
