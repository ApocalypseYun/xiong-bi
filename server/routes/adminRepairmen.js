const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getRepairmen, createRepairman, updateRepairman, deleteRepairman } = require('../controllers/adminRepairmanController');

router.use(authenticate);
router.use(authorize(['super_admin']));

router.get('/', getRepairmen);
router.post('/', createRepairman);
router.put('/:id', updateRepairman);
router.delete('/:id', deleteRepairman);

module.exports = router;
