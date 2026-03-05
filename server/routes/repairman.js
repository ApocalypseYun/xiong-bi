const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getPendingOrders, getMyOrders, acceptOrder, completeOrder, evaluateUser } = require('../controllers/repairmanController');

router.use(authenticate);
router.use(authorize(['repairman']));

router.get('/orders/pending', getPendingOrders);
router.get('/orders/mine', getMyOrders);
router.put('/orders/:id/accept', acceptOrder);
router.put('/orders/:id/complete', completeOrder);
router.post('/evaluations/:orderId', evaluateUser);

module.exports = router;
