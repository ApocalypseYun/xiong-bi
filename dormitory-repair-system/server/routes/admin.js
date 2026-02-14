const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllOrders,
  getPendingOrders,
  acceptOrder,
  completeOrder
} = require('../controllers/adminController');

router.use(authenticate);
router.use(authorize(['admin']));

router.get('/orders', getAllOrders);
router.get('/orders/pending', getPendingOrders);
router.put('/orders/:id/accept', acceptOrder);
router.put('/orders/:id/complete', completeOrder);

module.exports = router;
