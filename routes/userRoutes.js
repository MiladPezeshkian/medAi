const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

// همه کاربران
router.route("/").get(
  authController.protect, // فقط کاربران وارد شده می‌توانند کاربران را مشاهده کنند
  authController.restrictTo("admin", "manager"), // فقط ادمین‌ها می‌توانند کاربران را مشاهده کنند
  userController.getAllUsers
);
router.route("/banUser/:id").patch(
  authController.protect, // فقط کاربران وارد شده می‌توانند یک کاربر را مشاهده کنند
  authController.restrictTo("admin", "manager"), // ادمین یا مدیر می‌تواند مشاهده کنند
  userController.banUser
);
router.route("/unBanUser/:id").patch(
  authController.protect, // فقط کاربران وارد شده می‌توانند یک کاربر را مشاهده کنند
  authController.restrictTo("admin", "manager"), // ادمین یا مدیر می‌تواند مشاهده کنند
  userController.unBanUser
);
// عملیات بر روی یک کاربر بر اساس ID
router
  .route("/:id")
  .get(
    authController.protect, // فقط کاربران وارد شده می‌توانند یک کاربر را مشاهده کنند
    authController.restrictTo("admin", "manager"), // ادمین یا مدیر می‌تواند مشاهده کنند
    userController.getUser
  )
  .patch(
    authController.protect, // فقط کاربران وارد شده می‌توانند بروزرسانی کنند
    authController.restrictTo("admin", "manager"), // فقط ادمین یا مدیر می‌تواند بروزرسانی کند
    userController.updateUser
  )
  .delete(
    authController.protect, // فقط کاربران وارد شده می‌توانند حذف کنند
    authController.restrictTo("admin", "manager"), // فقط ادمین‌ها می‌توانند حذف کنند
    userController.deleteUser
  );

module.exports = router;
