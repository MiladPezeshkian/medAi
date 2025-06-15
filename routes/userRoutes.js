const express = require("express");
const router = express.Router();
const userController = require("../controllers/userAuthController");

// Public
router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.post("/forgotPassword", userController.forgotPassword);
router.post("/verifyResetCode", userController.verifyResetCode);
router.post("/resetPassword", userController.resetPassword);
router.get("/islogin", userController.isLogin);
// Protect all routes below
router.use(userController.protect);

router.get("/logout", userController.logout);
router.get("/me", userController.getMe);
router.patch("/updateMyPassword", userController.updateMyPassword);
router.patch("/updateMe", userController.updateMe);

module.exports = router;
