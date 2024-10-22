const express = require("express");
const wishlistController = require("../controllers/wishListController");
const authController = require("../controllers/authController");

const router = express.Router();

// همه روت‌ها نیاز به احراز هویت دارند
router.use(authController.protect);

// دریافت ویش‌لیست کاربر
router.get("/getall", wishlistController.getAllWishlist);

// اضافه کردن محصولات به ویش‌لیست
router.post("/setall", wishlistController.setAllWishlist);

module.exports = router;
