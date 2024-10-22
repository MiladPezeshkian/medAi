const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
      maxlength: [40, "Name cannot be more than 40 characters"],
    },
    PhoneNumber: {
      type: String,
      default: "none",
      validate: {
        validator: function (value) {
          if (value === "none") return true;
          return /^(?:\+?\d{1,3})?[ -]?\d{10}$/.test(value);
        },
        message: "Please provide a valid phone number",
      },
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin", "manager"],
      default: "user",
    },
    address: {
      type: String,
      default: "none",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    wishList: [
      {
        _id: false, // جلوگیری از تولید _id برای آیتم‌های wishList
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        title: {
          type: String,
        },
        price: {
          type: Number,
        },
        image: {
          type: String,
        },
        rating: {
          type: Number,
          default: 0,
        },
      },
    ],

    orders: [
      {
        _id: false,

        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

// هش کردن پسورد قبل از ذخیره
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);

  if (this.isModified("password") && !this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }

  next();
});

// متد برای بررسی پسورد درست
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// بررسی تغییر پسورد بعد از ایجاد توکن JWT
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const passwordChangedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < passwordChangedTimestamp;
  }
  return false;
};

// تولید توکن بازنشانی پسورد
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
