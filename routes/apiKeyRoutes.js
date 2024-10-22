const express = require("express");
const router = express.Router();
const apiKeyController = require("../controllers/apiKeyController");

router.get("/", apiKeyController.getApiKey);

module.exports = router;
