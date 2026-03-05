const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createOrder, getOrders, getOrderById, urgeOrder, withdrawOrder } = require('../controllers/orderController');

router.use(authenticate);

router.post('/', authorize(['student']), createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/:id/urge', authorize(['student']), urgeOrder);
router.delete('/:id', authorize(['student']), withdrawOrder);

module.exports = router;
