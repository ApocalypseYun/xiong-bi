const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLE_TYPES } = require('../middleware/auth');
const repairmanController = require('../controllers/repairmanController');

// 所有路由都需要认证和 super_admin 权限
router.use(authenticate);
router.use(authorize([ROLE_TYPES.SUPER_ADMIN]));

// POST /api/super-admin/repairman - 创建维修工
router.post('/', repairmanController.createRepairman);

// GET /api/super-admin/repairman - 获取所有维修工列表
router.get('/', repairmanController.getAllRepairmen);

// PUT /api/super-admin/repairman/:id - 更新维修工信息
router.put('/:id', repairmanController.updateRepairman);

// DELETE /api/super-admin/repairman/:id - 删除维修工
router.delete('/:id', repairmanController.deleteRepairman);

module.exports = router;
