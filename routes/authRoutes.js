const express = require("express");
const authController = require("../controllers/authController");
const { body } = require("express-validator");
const router = express.Router();

// Route for signup
router.post(
  "/signup",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
    body("passwordConfirm")
      .custom((value, { req }) => value === req.body.password)
      .withMessage("Passwords do not match"),
  ],
  authController.signup
);

// Route for login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  authController.login
);
//Check user is still login ?!
router.get("/islogin", authController.isLogin);

// Route for logout
router.patch("/logout", authController.protect, authController.logout);

// Route for forgot password (sending reset code)
router.post(
  "/forgotPassword",
  [body("email").isEmail().withMessage("Please provide a valid email")],
  authController.forgotPassword
);
router.post("/checkCode", authController.checkCode);
// Route for reset password (verifying code and setting new password)
router.patch(
  "/resetPassword",
  [
    body("code")
      .isLength({ min: 5, max: 5 })
      .withMessage("Please provide a valid 5-digit code"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
    body("passwordConfirm")
      .custom((value, { req }) => value === req.body.password)
      .withMessage("Passwords do not match"),
  ],
  authController.resetPassword
);
router.get("/me", authController.protect, authController.getMe);
router.patch(
  "/resetPasswordInLoggin",
  authController.protect,
  authController.resetPasswordinLoggin
);
router.patch("/updateme", authController.protect, authController.updateMe);
module.exports = router;
