const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLE_TYPES } = require('../middleware/auth');
const {
  createResident,
  getResidents,
  updateResident,
  deleteResident,
  importResidents
} = require('../controllers/residentController');
const excelUpload = require('../middleware/excelUpload');

// 所有路由都需要认证和 super_admin 权限
router.use(authenticate);
router.use(authorize([ROLE_TYPES.SUPER_ADMIN]));

// CRUD 路由
router.post('/', createResident);
router.get('/', getResidents);
router.put('/:id', updateResident);
router.delete('/:id', deleteResident);

// Excel 批量导入
router.post('/import', excelUpload.single('file'), importResidents);


module.exports = router;
