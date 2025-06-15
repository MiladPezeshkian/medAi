const multer = require("multer");
const path = require("path");

// تنظیم مسیر ذخیره فایل‌ها و نام فایل
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // مسیر ذخیره فایل‌ها
  },
  filename: function (req, file, cb) {
    // فایل رو با نام یکتا ذخیره کن: timestamp + نام اصلی فایل
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// فیلتر فقط برای فایل PDF
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"), false);
  }
};

const uploadPdf = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // حداکثر حجم 10 مگابایت (اختیاری)
});

module.exports = uploadPdf;
