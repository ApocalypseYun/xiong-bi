const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createOrder, getOrders, getOrderById, urgeOrder, withdrawOrder, repairmanEvaluate } = require('../controllers/orderController');

router.use(authenticate);

router.post('/', authorize(['student']), createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/:id/urge', urgeOrder);
router.post('/:id/withdraw', withdrawOrder);
router.post('/:id/repairman-evaluate', authorize(['repairman', 'super_admin']), repairmanEvaluate);

module.exports = router;
