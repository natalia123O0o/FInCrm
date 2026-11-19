
const express = require("express");

const router = express.Router();

const protect = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

const {
  sendEmail,
  getMessages,
} = require("./message.controller");

router.post(
  "/send",
  protect,
  authorizeRoles("ADMIN"),
  sendEmail
);

router.get(
  "/history",
  protect,
  authorizeRoles("ADMIN"),
  getMessages
);

module.exports = router;
