const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');
const { success, error } = require('../utils/response');

/**
 * Helper function to build full URL for uploaded files
 * @param {Request} req - Express request object
 * @param {string} filename - Uploaded file name
 * @returns {string} Full accessible URL
 */
const buildFileUrl = (req, filename) => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/images/${filename}`;
};

/**
 * Helper function to extract URLs from uploaded files
 * @param {Request} req - Express request object
 * @param {Express.Multer.File|Express.Multer.File[]} files - Uploaded file(s)
 * @returns {string[]} Array of accessible URLs
 */
const extractUrls = (req, files) => {
  if (!files) return [];
  const fileArray = Array.isArray(files) ? files : [files];
  return fileArray.map(file => buildFileUrl(req, file.filename));
};

/**
 * @route POST /api/upload/repair
 * @desc Upload repair images (students only)
 * @access Private (Student role required)
 * 
 * @headers Authorization: Bearer <token>
 * @body multipart/form-data with field name "image" or "images"
 * @returns {Object} { code: 200, message: "上传成功", data: { urls: [...] } }
 */
router.post(
  '/repair',
  authenticate,
  authorize(['student']),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 5 }
  ]),
  (req, res) => {
    try {
      const files = req.files;
      
      if (!files || (!files.image && !files.images)) {
        return error(res, '请选择要上传的图片', 400);
      }

      const allFiles = [
        ...(files.image || []),
        ...(files.images || [])
      ];

      const urls = extractUrls(req, allFiles);

      return success(res, { urls }, '上传成功');
    } catch (err) {
      console.error('Upload error:', err);
      return error(res, '上传失败，请重试', 500);
    }
  }
);

/**
 * @route POST /api/upload/completion
 * @desc Upload completion proof images (admin only)
 * @access Private (Admin role required)
 * 
 * @headers Authorization: Bearer <token>
 * @body multipart/form-data with field name "image" or "images"
 * @returns {Object} { code: 200, message: "上传成功", data: { urls: [...] } }
 */
router.post(
  '/completion',
  authenticate,
  authorize(['admin']),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 5 }
  ]),
  (req, res) => {
    try {
      const files = req.files;
      
      if (!files || (!files.image && !files.images)) {
        return error(res, '请选择要上传的图片', 400);
      }

      const allFiles = [
        ...(files.image || []),
        ...(files.images || [])
      ];

      const urls = extractUrls(req, allFiles);

      return success(res, { urls }, '上传成功');
    } catch (err) {
      console.error('Upload error:', err);
      return error(res, '上传失败，请重试', 500);
    }
  }
);

/**
 * Error handling middleware for multer errors
 */
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return error(res, '文件大小超过限制（最大5MB）', 400);
  }
  if (err.message === 'Only image files allowed') {
    return error(res, '只允许上传图片文件', 400);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return error(res, '不支持的文件字段名，请使用 image 或 images', 400);
  }
  console.error('Unhandled upload error:', err);
  return error(res, '上传失败', 500);
});

module.exports = router;
