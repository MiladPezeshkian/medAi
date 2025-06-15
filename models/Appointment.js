// models/Appointment.js
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentType: {
      type: String,
      enum: ["emergency", "consultation", "checkup", "follow-up"],
      default: "online",
    },
    status: {
      type: String,
      enum: ["available", "booked", "closed", "cancelled"],
      default: "available",
    },

    description: {
      type: String,
      maxlength: 1000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paymentDate: {
      type: Date,
    },
    paymentRef: {
      type: String,
    },
    requests: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        message: { type: String },
        requestedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
