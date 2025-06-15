const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor", // فرض بر این است که مدل User برای پزشک و بیمار وجود دارد
      required: [true, "شناسه پزشک الزامی است"],
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "شناسه بیمار الزامی است"],
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: [true, "شناسه نوبت الزامی است"],
      unique: true, // هر نوبت فقط یک مکالمه دارد
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// اطمینان از یکتا بودن مکالمه برای هر نوبت

module.exports = mongoose.model("Conversation", conversationSchema);
