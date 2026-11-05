
const express = require("express");
const router = express.Router();

const {
  createCollectionLog
} = require("./collection.controller");

const protect = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// Registrar una gestión de cobranza
router.post(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  createCollectionLog
);

module.exports = router;
