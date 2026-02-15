const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { 
  getAllAnnouncements, 
  createAnnouncement, 
  updateAnnouncement, 
  deleteAnnouncement 
} = require('../controllers/announcementController');

// 公开公告路由（无需认证）
router.get('/', getAllAnnouncements);

// 管理员公告路由
router.post('/admin', authenticate, authorize(['admin']), createAnnouncement);
router.put('/admin/:id', authenticate, authorize(['admin']), updateAnnouncement);
router.delete('/admin/:id', authenticate, authorize(['admin']), deleteAnnouncement);

module.exports = router;
