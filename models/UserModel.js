// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const medicalRecordSchema = new mongoose.Schema(
  {
    chronicDiseases: [String],
    allergies: [String],
    medications: [String],
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    heightCm: Number,
    weightKg: Number,
    previousConsultations: [
      {
        doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
        date: Date,
        diagnosis: String,
        prescription: String,
        notes: String,
      },
    ],
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name."],
      trim: true,
      maxlength: [100, "Name must have less than or equal to 100 characters."],
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
      select: false, // Do not return password by default
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
    role: {
      type: String,
      enum: ["patient"],
      default: "patient",
    },
    credit: {
      type: Number,
      default: 0,
      min: [0, "Credit cannot be negative."],
    },
    profilePictureUrl: {
      type: String,
      trim: true,
      default: "",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    dateOfBirth: {
      type: Date,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    // Embedded Medical Record
    medicalRecord: medicalRecordSchema,

    // Password reset fields
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Track if user changed password after issuing token
    passwordChangedAt: Date,

    // Track if user is active or banned
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// -------------------------------
// MIDDLEWARE: Hash password before saving
// -------------------------------
userSchema.pre("save", async function (next) {
  // Only run if password was modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Remove passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

// -------------------------------
// MIDDLEWARE: Update passwordChangedAt timestamp
// -------------------------------
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  // Subtract 1 second to ensure token is issued after this timestamp
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// -------------------------------
// INSTANCE METHOD: Check if candidate password is correct
// -------------------------------
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// -------------------------------
// INSTANCE METHOD: Check if user changed password after JWT issued
// -------------------------------
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed
  return false;
};

// -------------------------------
// INSTANCE METHOD: Create password reset token
// -------------------------------
userSchema.methods.createPasswordResetToken = function () {
  // Generate a random 32-byte string
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash the token and set to passwordResetToken field
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expiration to 10 minutes from now
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // Return the plain reset token (to send via email)
  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
