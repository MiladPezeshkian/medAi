const express = require("express");
const couponController = require("../controllers/couponController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router
  .route("/")
  .get(authController.restrictTo("admin"), couponController.getAllCoupons)
  .post(authController.restrictTo("admin"), couponController.createCoupon);

router
  .route("/:id")
  .get(authController.restrictTo("admin", "user"), couponController.getCoupon)
  .patch(authController.restrictTo("admin"), couponController.updateCoupon)
  .delete(authController.restrictTo("admin"), couponController.deleteCoupon);

module.exports = router;
