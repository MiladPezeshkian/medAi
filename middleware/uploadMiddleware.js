const multer = require("multer");
const path = require("path");

// تنظیمات ذخیره‌سازی Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // مسیر ذخیره‌سازی فایل‌ها
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // نام فایل منحصر به فرد
  },
});

// فیلتر کردن فایل‌ها بر اساس نوع
const fileFilter = (req, file, cb) => {
  const fileTypes = /jpeg|jpg|png/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("فقط فرمت‌های JPEG، JPG و PNG پشتیبانی می‌شوند"));
  }
};

// استفاده از multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // محدودیت حجم 5 مگابایت
  fileFilter: fileFilter,
});

module.exports = upload;
