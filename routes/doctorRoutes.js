// routes/doctorRoutes.js
const express = require("express");
const doctorAuthController = require("../controllers/doctorAuthController");
const router = express.Router();

router.post("/signup", doctorAuthController.signup);
router.post("/login", doctorAuthController.login);
router.post("/forgotPassword", doctorAuthController.forgotPassword);
router.post("/checkResetCode", doctorAuthController.checkResetCode);
router.post("/resetPassword", doctorAuthController.resetPassword);
router.get("/islogin", doctorAuthController.isLogin);
router.use(doctorAuthController.protect);
// Route for logout
router.patch("/logout", doctorAuthController.logout);
router.patch("/updateMyPassword", doctorAuthController.updateMyPassword);
router.patch("/updateMe", doctorAuthController.updateMe);
router.get("/me", doctorAuthController.getMe);
router.get("/logout", doctorAuthController.logout);

module.exports = router;
