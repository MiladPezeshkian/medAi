const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const {
  protect: protectDoctor,
} = require("../controllers/doctorAuthController");

// دکتر نوبت‌های خودش رو می‌بینه
router.get(
  "/doctor",
  protectDoctor,
  appointmentController.getDoctorAppointments
);

// دکتر تأیید می‌کنه که کدوم درخواست پذیرفته بشه
router.patch(
  "/confirm",
  protectDoctor,
  appointmentController.confirmAppointmentRequest
);

// دکتر آپدیت می‌کنه (فقط اطلاعات غیر از تاریخ)
router.patch(
  "/:id",
  protectDoctor,
  appointmentController.updateAppointmentByDoctor
);

// دکتر نوبت خودش رو حذف می‌کنه
router.delete(
  "/:id",
  protectDoctor,
  appointmentController.deleteAppointmentByDoctor
);
// دکتر یک قرار ملاقات جدید ایجاد می‌کند
router.post("/", protectDoctor, appointmentController.createAppointment);
// دکتر درخواست‌های کاربران برای نوبت‌هایش را می‌بیند
router
  .route("/:appointmentId/requests")
  .get(protectDoctor, appointmentController.getAppointmentRequestsForDoctor);

// برنامه‌ زمانبندی دکتر (فقط تاریخ قرارها)
router.get("/schedule", protectDoctor, appointmentController.getDoctorSchedule);
// بستن نوبت و پایان چت
router.patch(
  "/:id/close",
  protectDoctor,
  appointmentController.closeAppointment
);
router.patch(
  "/reject",
  protectDoctor,
  appointmentController.rejectAppointmentRequest
);

module.exports = router;
