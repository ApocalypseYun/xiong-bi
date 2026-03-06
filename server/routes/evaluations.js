const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createEvaluation, getMyEvaluations, getAllEvaluations, getOrderEvaluation, getRepairmanEvaluations } = require('../controllers/evaluationController');

// 学生评价路由（需要认证）
router.post('/', authenticate, createEvaluation);
router.get('/', authenticate, getMyEvaluations);

// 管理员评价路由
router.get('/admin', authenticate, authorize(['super_admin']), getAllEvaluations);

// 获取单个订单评价
router.get('/order/:orderId', authenticate, getOrderEvaluation);

// 维修工评价路由
router.get('/repairman', authenticate, authorize(['repairman']), getRepairmanEvaluations);

module.exports = router;
