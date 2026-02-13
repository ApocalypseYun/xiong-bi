const pool = require('../config/database');
const { success, error } = require('../utils/response');

// 获取公告列表（公开）
const getAllAnnouncements = async (req, res) => {
  try {
    const [announcements] = await pool.execute(
      `SELECT announcementId, title, content, createdAt 
       FROM announcements 
       ORDER BY createdAt DESC`
    );

    return success(res, announcements, '获取成功');
  } catch (err) {
    console.error('获取公告列表错误:', err);
    return error(res, '获取公告列表失败', 500);
  }
};

// 创建公告（管理员）
const createAnnouncement = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { title, content } = req.body;

    // 验证必填字段
    if (!title || !content) {
      return error(res, '标题和内容不能为空', 400);
    }

    // 创建公告
    const [result] = await pool.execute(
      `INSERT INTO announcements (title, content, adminId, createdAt) 
       VALUES (?, ?, ?, NOW())`,
      [title, content, adminId]
    );

    return success(res, {
      announcementId: result.insertId,
      title,
      content
    }, '发布成功');
  } catch (err) {
    console.error('创建公告错误:', err);
    return error(res, '创建公告失败', 500);
  }
};

// 更新公告（管理员）
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    // 检查公告是否存在
    const [announcements] = await pool.execute(
      `SELECT announcementId FROM announcements WHERE announcementId = ?`,
      [id]
    );

    if (announcements.length === 0) {
      return error(res, '公告不存在', 404);
    }

    // 构建更新字段
    const updates = [];
    const values = [];

    if (title !== undefined) {
      if (!title) {
        return error(res, '标题不能为空', 400);
      }
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      if (!content) {
        return error(res, '内容不能为空', 400);
      }
      updates.push('content = ?');
      values.push(content);
    }

    if (updates.length === 0) {
      return error(res, '没有需要更新的字段', 400);
    }

    values.push(id);

    // 执行更新
    await pool.execute(
      `UPDATE announcements SET ${updates.join(', ')} WHERE announcementId = ?`,
      values
    );

    return success(res, null, '更新成功');
  } catch (err) {
    console.error('更新公告错误:', err);
    return error(res, '更新公告失败', 500);
  }
};

// 删除公告（管理员）
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查公告是否存在
    const [announcements] = await pool.execute(
      `SELECT announcementId FROM announcements WHERE announcementId = ?`,
      [id]
    );

    if (announcements.length === 0) {
      return error(res, '公告不存在', 404);
    }

    // 删除公告
    await pool.execute(
      `DELETE FROM announcements WHERE announcementId = ?`,
      [id]
    );

    return success(res, null, '删除成功');
  } catch (err) {
    console.error('删除公告错误:', err);
    return error(res, '删除公告失败', 500);
  }
};

module.exports = {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
