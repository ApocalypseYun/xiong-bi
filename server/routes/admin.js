const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllOrders,
  getPendingOrders,
  getUrgedOrders
} = require('../controllers/adminController');

router.use(authenticate);
router.use(authorize(['super_admin']));

router.get('/orders', getAllOrders);
router.get('/orders/pending', getPendingOrders);
router.get('/orders/urged', getUrgedOrders);

module.exports = router;
