// models/Doctor.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// Schema for doctor's available time slots
const availableSlotSchema = new mongoose.Schema(
  {
    start: {
      type: Date,
      required: [true, "Start time is required for an available slot."],
    },
    end: {
      type: Date,
      required: [true, "End time is required for an available slot."],
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Schema for patient reviews
const reviewSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a patient."],
    },
    rating: {
      type: Number,
      min: [1, "Rating must be at least 1."],
      max: [5, "Rating must be at most 5."],
      required: [true, "Rating is required."],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters."],
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name."],
      trim: true,
      maxlength: [100, "Name must have at most 100 characters."],
    },
    email: {
      type: String,
      required: [true, "Please provide your email address."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address.",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password."],
      minlength: [8, "Password must be at least 8 characters long."],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password."],
      validate: {
        // This only works on CREATE and SAVE!!!
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords do not match.",
      },
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    role: {
      type: String,
      enum: ["doctor"],
      default: "doctor",
    },
    specialty: {
      type: String,
      required: [true, "Please specify your specialty."],
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, "Medical license number is required."],
      unique: true,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, "Biography cannot exceed 1000 characters."],
    },
    ratePerConsultation: {
      type: Number,
      required: [true, "Consultation fee is required."],
      min: [0, "Fee must be a positive number."],
    },
    profilePictureUrl: {
      type: String,
      trim: true,
      default: "",
    },
    yearsOfExperience: {
      type: Number,
      min: [0, "Years of experience cannot be negative."],
    },
    languagesSpoken: [
      {
        type: String,
        trim: true,
      },
    ],
    availableSlots: [availableSlotSchema],
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be negative."],
      max: [5, "Rating cannot exceed 5."],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, "Review count cannot be negative."],
    },
    reviews: [reviewSchema],
    contactInfo: {
      phoneNumber: {
        type: String,
        trim: true,
      },
      clinicAddress: {
        type: String,
        trim: true,
      },
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
doctorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

// Update passwordChangedAt timestamp
doctorSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Instance method: compare passwords
doctorSchema.methods.correctPassword = async function (
  candidatePassword,
  storedPassword
) {
  return await bcrypt.compare(candidatePassword, storedPassword);
};

// Instance method: check if password changed after JWT issued
doctorSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTS = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTS;
  }
  return false;
};

// Instance method: create password reset token
doctorSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model("Doctor", doctorSchema);
