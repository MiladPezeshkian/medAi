const multer = require("multer");
const path = require("path");
const AppError = require("../utils/AppError");

// تنظیم ذخیره‌سازی فایل‌ها
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// فیلتر نوع فایل (فقط PDF)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new AppError("فقط فایل‌های PDF مجاز هستند", 400), false);
  }
};

// تنظیمات Multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // حداکثر 5 مگابایت
  },
});

module.exports = upload;
