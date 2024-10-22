const express = require("express");
const orderController = require("../controllers/orderController");
const authController = require("../controllers/authController");

const router = express.Router();

// حفاظت از تمامی روت‌ها (فقط کاربران وارد شده می‌توانند دسترسی داشته باشند)
router.use(authController.protect);

// روت برای گرفتن سفارشات کاربر جاری با فیلتر (همه، تحویل شده، تحویل نشده)
router.get("/myOrders", orderController.getMyOrders);
router
  .route("/reports")
  .get(authController.restrictTo("admin"), orderController.getAllOrders2);
// روت‌هایی که فقط ادمین‌ها دسترسی دارند
router
  .route("/")
  .get(authController.restrictTo("admin"), orderController.getAllOrders) // ادمین به همه سفارش‌ها دسترسی دارد
  .post(orderController.createOrder); // هر کاربری می‌تواند سفارش ایجاد کند
// ادمین به همه سفارش‌ها دسترسی دارد

// روت‌هایی که به یک سفارش خاص مربوط می‌شود
router
  .route("/:id")
  .get(orderController.getOrder) // هر کاربری که وارد شده است، می‌تواند سفارش خود را مشاهده کند
  .patch(authController.restrictTo("admin"), orderController.updateOrder) // فقط ادمین می‌تواند سفارش‌ها را ویرایش کند
  .delete(authController.restrictTo("admin"), orderController.deleteOrder); // فقط ادمین می‌تواند سفارش‌ها را حذف کند

module.exports = router;
