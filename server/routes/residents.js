const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getResidents, createResident, updateResident, deleteResident, importResidents
} = require('../controllers/residentController');

const memUpload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.use(authorize(['super_admin']));

router.get('/', getResidents);
router.post('/import', memUpload.single('file'), importResidents);
router.post('/', createResident);
router.put('/:id', updateResident);
router.delete('/:id', deleteResident);

module.exports = router;
