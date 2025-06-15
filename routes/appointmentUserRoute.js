const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const { protect: protectUser } = require("../controllers/userAuthController");
router.post("/request", protectUser, appointmentController.requestAppointment);
router.get(
  "/my-appointments",
  protectUser,
  appointmentController.getUserAppointments
);
router.get("/all", protectUser, appointmentController.getAllAppointments);
module.exports = router;
