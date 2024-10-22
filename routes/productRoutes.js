const express = require("express");
const productController = require("../controllers/productController");
const authController = require("../controllers/authController");
const upload = require("../middleware/uploadMiddleware"); // اضافه کردن middleware برای آپلود فایل

const router = express.Router();
router
  .patch(
    "/updateReview",
    authController.protect,
    authController.restrictTo("admin"),
    productController.updateComment
  )
  .delete(
    "/deleteReview",
    authController.protect,
    authController.restrictTo("admin"),
    productController.DeleteComment
  )
  .get(
    "/userComments/:id",
    authController.protect,
    authController.restrictTo("admin"),
    productController.UserComments
  );
// همه‌ی کاربران می‌توانند محصولات را مشاهده کنند
router.route("/").get(productController.getAllProducts).post(
  authController.protect,
  authController.restrictTo("admin"),
  upload.single("image"), // اضافه کردن قابلیت آپلود فایل فقط برای ادمین
  productController.createProduct
);
router.get(
  "/allComments",
  authController.protect,
  authController.restrictTo("admin"),
  productController.getAllComments
);
router
  .route("/:id")
  .get(productController.getProduct)
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    productController.updateProduct
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    productController.deleteProduct
  );
router.post(
  "/addReview/:id",
  authController.protect,
  productController.addReview
);

router.get("/reviews/:id", productController.getComments);
router.get(
  "/allComments",
  authController.protect,
  authController.restrictTo("admin"),
  productController.getAllComments
);

module.exports = router;
