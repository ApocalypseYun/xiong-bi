const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getProfile, updateProfile } = require('../controllers/userController');

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

module.exports = router;
