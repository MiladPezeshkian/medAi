// controllers/DoctorsForUserController.js
const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const Doctor = require("../models/DoctorModel");
const Appointment = require("../models/Appointment");

// @desc    Get all doctors with summary info for user cards
// @route   GET /api/v1/doctors
// @access  Public
exports.getAllDoctors = catchAsync(async (req, res, next) => {
  const doctors = await Doctor.find({ isActive: true }).select(
    "name specialty profilePictureUrl rating reviewCount yearsOfExperience ratePerConsultation languagesSpoken"
  );

  res.status(200).json({
    status: "success",
    results: doctors.length,
    data: doctors,
  });
});

// @desc    Get all reviews for a specific doctor
// @route   GET /api/v1/doctors/:id/reviews
// @access  Public
exports.getDoctorReviews = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid doctor ID.", 400));
  }

  const doctor = await Doctor.findById(id)
    .select("reviews")
    .populate("reviews.patient", "name profilePictureUrl");

  if (!doctor) {
    return next(new AppError("Doctor not found.", 404));
  }

  res.status(200).json({
    status: "success",
    results: doctor.reviews.length,
    data: doctor.reviews,
  });
});

// @desc    Add a review for a doctor (only if patient has an appointment)
// @route   POST /api/v1/doctors/:id/reviews
// @access  Private (patient)
exports.addReview = catchAsync(async (req, res, next) => {
  const doctorId = req.params.id;
  const patientId = req.user.id;
  const { rating, comment } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(doctorId) ||
    !mongoose.Types.ObjectId.isValid(patientId)
  ) {
    return next(new AppError("Invalid ID provided.", 400));
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return next(new AppError("Doctor not found.", 404));
  }

  const appointment = await Appointment.findOne({
    doctor: doctorId,
    patient: patientId,
    status: { $in: ["booked", "closed"] },
  });
  if (!appointment) {
    return next(
      new AppError(
        "You must have an appointment with this doctor to leave a review.",
        403
      )
    );
  }

  doctor.reviews.push({ patient: patientId, rating, comment });
  doctor.reviewCount = doctor.reviews.length;
  const totalRating = doctor.reviews.reduce((sum, r) => sum + r.rating, 0);
  doctor.rating = Number((totalRating / doctor.reviewCount).toFixed(1));
  await doctor.save({ validateBeforeSave: false });

  res.status(201).json({
    status: "success",
    message: "Review added successfully.",
  });
});

// @desc    Request an appointment with a doctor
// @route   POST /api/v1/doctors/:id/appointments
// @access  Private (patient)
exports.requestAppointment = catchAsync(async (req, res, next) => {
  const doctorId = req.params.id;
  const patientId = req.user.id;
  const { appointmentDate, appointmentType, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return next(new AppError("Invalid doctor ID.", 400));
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return next(new AppError("Doctor not found.", 404));
  }

  const appointment = await Appointment.create({
    doctor: doctorId,
    appointmentDate,
    appointmentType,
    description,
    price: doctor.ratePerConsultation,
    patient: patientId,
    status: "booked",
    isPaid: false,
  });

  res.status(201).json({
    status: "success",
    data: appointment,
  });
});
