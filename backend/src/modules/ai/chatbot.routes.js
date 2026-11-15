
const express = require("express");
const router = express.Router();

const protect = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

const { consultarGemini } = require("./chatbot.controller");

router.post(
  "/chat",
  protect,
  authorizeRoles("ADMIN", "USER"),
  consultarGemini
);

module.exports = router;
