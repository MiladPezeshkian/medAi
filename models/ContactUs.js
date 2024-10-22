const mongoose = require("mongoose");
const validator = require("validator");

// ContactUs Schema
const contactUsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: [3, "Name must be at least 3 characters"],
    maxlength: [50, "Name must be less than 50 characters"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    validate: {
      validator: (value) => validator.isEmail(value),
      message: "Please provide a valid email address",
    },
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    validate: {
      validator: (value) => validator.isMobilePhone(value, "any"),
      message: "Please provide a valid phone number",
    },
  },
  message: {
    type: String,
    required: [true, "Message is required"],
    trim: true,
    minlength: [10, "Message must be at least 10 characters"],
    maxlength: [500, "Message must be less than 500 characters"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ContactUs = mongoose.model("ContactUs", contactUsSchema);
module.exports = ContactUs;
