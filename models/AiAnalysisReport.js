// models/AiAnalysisReport.js

const mongoose = require("mongoose");

const ConditionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // نام بیماری
    probability: { type: String, required: true }, // درصد احتمال (مثلاً "45%")
    specialist: { type: String, required: true }, // نوع پزشک پیشنهاد‌شده
  },
  { _id: false }
);

const AiAnalysisReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    height: { type: Number, required: true }, // cm
    weight: { type: Number, required: true }, // kg
    bmi: { type: String, required: true },
    currentMedications: { type: String, default: "" },
    medicalHistory: { type: String, default: "" },
    symptoms: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    AllowedPublish: {
      Message: { type: String, default: "" },
      Status: { type: Boolean, default: false },
    },
    // پاسخ نهایی تحلیل هوش مصنوعی
    aiResponse: {
      summary: { type: String, default: "" }, // خلاصه تحلیل
      conditions: { type: [ConditionSchema], default: [] }, // لیست بیماری‌ها با درصد و متخصص
      doctorType: { type: [String], default: [] }, // نوع پزشک(ها)
      urgencyLevel: {
        type: String,
        enum: ["low", "moderate", "high"],
        default: "moderate",
      }, // سطح اورژانسی بودن
      recommendations: { type: [String], default: [] }, // لیست پیشنهادها
      rawResponse: { type: Object, default: {} }, // خروجی خام از مدل هوش مصنوعی
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AiAnalysisReport", AiAnalysisReportSchema);
