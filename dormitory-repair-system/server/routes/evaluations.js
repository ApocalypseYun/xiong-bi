const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createEvaluation, getMyEvaluations, getAllEvaluations } = require('../controllers/evaluationController');

// 学生评价路由（需要认证）
router.post('/', authenticate, createEvaluation);
router.get('/', authenticate, getMyEvaluations);

// 管理员评价路由
router.get('/admin', authenticate, authorize(['admin']), getAllEvaluations);

module.exports = router;
