// controllers/appointmentController.js
const Appointment = require("../models/Appointment");
const catchAsync = require("../utils/catchAsync");
const Conversation = require("../models/Conversation");
// 1. Get all appointments (for admin or management use)
exports.getAllAppointments = catchAsync(async (req, res) => {
  const appointments = await Appointment.find({
    status: { $ne: "booked" },
  }).populate("doctor", "name specialty");

  res.status(200).json({ status: "success", data: appointments });
});

// 2. Get appointments created by the logged-in doctor
exports.getDoctorAppointments = catchAsync(async (req, res) => {
  const appointments = await Appointment.find({ doctor: req.user._id })
    .populate("patient", "name email")
    .populate("requests.user", "name email profilePictureUrl gender");

  res.status(200).json({ status: "success", data: appointments });
});

// 3. User requests an appointment (adds a request to appointment)
exports.requestAppointment = catchAsync(async (req, res) => {
  const { appointmentId, message } = req.body;
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment || appointment.status !== "available") {
    return res.status(400).json({ message: "Appointment not available" });
  }

  const alreadyRequested = appointment.requests.find(
    (r) => r.user.toString() === req.user._id.toString()
  );
  if (alreadyRequested) {
    return res
      .status(400)
      .json({ message: "You have already requested this appointment" });
  }

  appointment.requests.push({ user: req.user._id, message });
  await appointment.save();

  res.status(200).json({ status: "success", message: "Request submitted" });
});

// 4. Doctor confirms a request (assigns patient and updates status)
exports.confirmAppointmentRequest = catchAsync(async (req, res) => {
  const { requestId } = req.body;
  console.log("📥 Incoming request body:", req.body);

  if (!requestId || !requestId.userId)
    return res.status(400).json({ message: "User ID is required" });

  const userId = requestId.userId;

  // مرحله 1: پیدا کردن نوبتی که شامل این userId باشه
  const appointment = await Appointment.findOne({ "requests.user": userId });

  if (!appointment)
    return res
      .status(404)
      .json({ message: "Appointment or request not found" });

  // بررسی مجاز بودن دکتر
  if (appointment.doctor.toString() !== req.user._id.toString())
    return res
      .status(403)
      .json({ message: "Not authorized to confirm this appointment" });

  // مرحله 2: پیدا کردن خود درخواست
  const requestObj = appointment.requests.find(
    (r) => r.user.toString() === userId
  );

  if (!requestObj)
    return res.status(400).json({ message: "Request not found" });
  const patientId = requestObj.user;
  // مرحله 3: آپدیت وضعیت نوبت
  appointment.status = "booked";
  appointment.patient = patientId;
  appointment.requests = []; // پاک‌سازی درخواست‌های دیگر
  await appointment.save();

  // مرحله 4: ساختن conversation اگر قبلاً وجود نداشته
  const existingConversation = await Conversation.findOne({
    appointmentId: appointment._id,
  });

  if (!existingConversation) {
    await Conversation.create({
      doctorId: appointment.doctor,
      patientId: patientId,
      appointmentId: appointment._id,
    });
  }

  res.status(200).json({
    status: "success",
    message: "Appointment confirmed and conversation started",
  });
});

// 5. Doctor updates their own appointment (but not status or patient directly)
exports.updateAppointmentByDoctor = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { description, price, appointmentType } = req.body;

  const appointment = await Appointment.findById(id);
  if (
    !appointment ||
    appointment.doctor.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ message: "Not allowed" });
  }

  // حذف ability تغییر تاریخ
  if (description) appointment.description = description;
  if (price !== undefined) appointment.price = price;
  if (appointmentType) appointment.appointmentType = appointmentType;

  await appointment.save();
  res.status(200).json({ status: "success", data: appointment });
});

// 6. Doctor deletes their own appointment
exports.deleteAppointmentByDoctor = catchAsync(async (req, res) => {
  const { id } = req.params;

  const appointment = await Appointment.findById(id);
  if (
    !appointment ||
    appointment.doctor.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ message: "Not allowed" });
  }

  await Appointment.findByIdAndDelete(id);
  res.status(204).json({ status: "success", data: null });
});

// 7. User sees their own booked appointments
exports.getUserAppointments = catchAsync(async (req, res) => {
  const appointments = await Appointment.find({
    patient: req.user._id,
  }).populate("doctor", "name email");
  console.log(appointments);
  res.status(200).json({ status: "success", data: appointments });
});
// 8. Doctor creates a new appointment
exports.createAppointment = catchAsync(async (req, res) => {
  const { date, time, description, price, appointmentType } = req.body;

  if (!date || !time || !price) {
    return res
      .status(400)
      .json({ message: "Date, time and price are required" });
  }

  const appointmentDate = new Date(`${date}T${time}`);

  if (isNaN(appointmentDate.getTime())) {
    return res.status(400).json({ message: "Invalid date or time format" });
  }

  const newAppointment = await Appointment.create({
    doctor: req.user._id,
    appointmentDate,
    description,
    price,
    appointmentType,
    status: "available", // available برای درخواست توسط کاربر
    requests: [],
  });

  res.status(201).json({ status: "success", data: newAppointment });
});
// 9. Doctor sees all requests made by users for their appointments
exports.getAppointmentRequestsForDoctor = catchAsync(async (req, res) => {
  const { appointmentId } = req.params;

  // اگر appointmentId وجود نداشته باشه یا طولش مناسب نباشه (نه 24 رقمی)
  if (!appointmentId || appointmentId.length !== 24) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid or missing appointment ID",
    });
  }

  // بررسی اینکه دکتر فقط به نوبت‌های خودش دسترسی داشته باشد
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: req.user._id,
  })
    .select("appointmentDate requests")
    .populate("requests.user", "name email");

  if (!appointment) {
    return res.status(404).json({
      status: "fail",
      message: "Appointment not found or not authorized",
    });
  }

  const formattedRequests = appointment.requests.map((r) => ({
    userId: r.user._id,
    name: r.user.name,
    email: r.user.email,
    message: r.message,
  }));
  console.log(formattedRequests);
  res.status(200).json({
    status: "success",
    data: {
      appointmentId: appointment._id,
      appointmentDate: appointment.appointmentDate,
      requests: formattedRequests,
    },
  });
});

// controllers/appointmentController.js

exports.getDoctorSchedule = catchAsync(async (req, res) => {
  const appointments = await Appointment.find({ doctor: req.user._id })
    .select("appointmentDate status patient price appointmentType description")
    .populate("patient", "name email");

  const schedule = appointments.map((appt) => ({
    id: appt._id,
    appointmentDate: appt.appointmentDate,
    status: appt.status,
    patient: appt.patient
      ? {
          id: appt.patient._id,
          name: appt.patient.name,
          email: appt.patient.email,
        }
      : null,
    price: appt.price,
    appointmentType: appt.appointmentType,
    description: appt.description,
  }));

  res.status(200).json({
    status: "success",
    results: schedule.length,
    data: schedule,
  });
});
exports.closeAppointment = catchAsync(async (req, res) => {
  const { id } = req.params;

  const appointment = await Appointment.findById(id);
  if (
    !appointment ||
    appointment.doctor.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ message: "Not allowed" });
  }

  // تغییر وضعیت به “closed”
  appointment.status = "closed";
  await appointment.save();

  // بستن کانورسیشن مرتبط
  await Conversation.findOneAndUpdate({ appointment: id }, { isClosed: true });

  res.status(200).json({
    status: "success",
    message: "Appointment closed and conversation ended",
  });
});

exports.rejectAppointmentRequest = catchAsync(async (req, res, next) => {
  const { requestId } = req.body;

  if (!requestId) {
    return next(new AppError("شناسه درخواست الزامی است", 400));
  }

  // ۱. پیدا کردن نوبتی که این درخواست داخل آن هست و پزشکش همین پزشک فعلی است
  const appointment = await Appointment.findOne({
    doctor: req.user._id,
    "requests._id": requestId,
  });

  if (!appointment) {
    return next(
      new AppError(
        "درخواست مورد نظر یافت نشد یا شما مجاز به رد کردن آن نیستید",
        404
      )
    );
  }

  // ۲. حذف درخواست از لیست
  appointment.requests = appointment.requests.filter(
    (req) => req._id.toString() !== requestId
  );

  await appointment.save();

  res.status(200).json({
    status: "success",
    message: "درخواست با موفقیت رد شد",
  });
});
