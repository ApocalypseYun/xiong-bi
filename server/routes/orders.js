const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createOrder, getOrders, getOrderById } = require('../controllers/orderController');

router.use(authenticate);

router.post('/', authorize(['student']), createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);

module.exports = router;
