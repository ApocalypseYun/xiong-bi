const pool = require('../config/database');
const { success, error } = require('../utils/response');

// 获取用户信息
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 查询用户信息（排除密码）
    const [users] = await pool.execute(
      `SELECT userId, username, role, realName, phone, roomNumber, building, createdAt 
       FROM users WHERE userId = ?`,
      [userId]
    );

    if (users.length === 0) {
      return error(res, '用户不存在', 404);
    }

    return success(res, users[0], '获取成功');
  } catch (err) {
    console.error('获取用户信息错误:', err);
    return error(res, '获取用户信息失败', 500);
  }
};

// 更新用户信息
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { realName, phone, roomNumber, building } = req.body;

    // 构建更新字段
    const updates = [];
    const values = [];

    if (realName !== undefined) {
      updates.push('realName = ?');
      values.push(realName);
    }
    if (phone !== undefined) {
      // 验证手机号格式（如果提供）
      if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
        return error(res, '手机号格式不正确', 400);
      }
      updates.push('phone = ?');
      values.push(phone);
    }
    if (roomNumber !== undefined) {
      updates.push('roomNumber = ?');
      values.push(roomNumber);
    }
    if (building !== undefined) {
      updates.push('building = ?');
      values.push(building);
    }

    if (updates.length === 0) {
      return error(res, '没有需要更新的字段', 400);
    }

    values.push(userId);

    // 执行更新
    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE userId = ?`,
      values
    );

    // 返回更新后的用户信息
    const [users] = await pool.execute(
      `SELECT userId, username, role, realName, phone, roomNumber, building, createdAt 
       FROM users WHERE userId = ?`,
      [userId]
    );

    return success(res, users[0], '更新成功');
  } catch (err) {
    console.error('更新用户信息错误:', err);
    return error(res, '更新用户信息失败', 500);
  }
};

module.exports = {
  getProfile,
  updateProfile
};
