const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Please provide a coupon code"],
      unique: true,
    },
    discount: {
      type: Number,
      required: [true, "Please provide a discount value"],
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
