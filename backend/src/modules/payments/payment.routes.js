
const express = require("express");
const router = express.Router();

const {
  createPayment,
  getPayments
} = require("./payment.controller");

const protect = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// POST /api/payments
// Registrar un pago
router.post(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  createPayment
);

router.get(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  getPayments
);

module.exports = router;
