const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { success, error } = require('../utils/response');

const SALT_ROUNDS = 10;

// 创建维修工 (仅 super_admin)
const createRepairman = async (req, res) => {
  try {
    const { username, password, realName, phone } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return error(res, '用户名和密码为必填项', 400);
    }

    // 检查用户名是否已存在
    const [existing] = await pool.execute(
      'SELECT userId FROM users WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      return error(res, '用户名已存在', 400);
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 创建维修工，role 自动设为 repairman
    const [result] = await pool.execute(
      `INSERT INTO users (username, password, role, realName, phone)
       VALUES (?, ?, 'repairman', ?, ?)`,
      [username, hashedPassword, realName || null, phone || null]
    );

    return success(res, {
      userId: result.insertId,
      username,
      role: 'repairman',
      realName: realName || null,
      phone: phone || null
    }, '维修工创建成功', 201);
  } catch (err) {
    console.error('创建维修工错误:', err);
    return error(res, '创建维修工失败', 500);
  }
};

// 获取所有维修工列表 (仅 super_admin)
const getAllRepairmen = async (req, res) => {
  try {
    const [repairmen] = await pool.execute(
      `SELECT userId, username, realName, phone, createdAt, updatedAt
       FROM users
       WHERE role = 'repairman'
       ORDER BY createdAt DESC`
    );

    return success(res, repairmen, '获取维修工列表成功');
  } catch (err) {
    console.error('获取维修工列表错误:', err);
    return error(res, '获取维修工列表失败', 500);
  }
};

// 更新维修工信息 (仅 super_admin)
const updateRepairman = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, realName, phone } = req.body;

    // 检查维修工是否存在
    const [existing] = await pool.execute(
      'SELECT userId, username FROM users WHERE userId = ? AND role = ?',
      [id, 'repairman']
    );

    if (existing.length === 0) {
      return error(res, '维修工不存在', 404);
    }

    // 如果要更新用户名，检查是否已被使用
    if (username && username !== existing[0].username) {
      const [usernameCheck] = await pool.execute(
        'SELECT userId FROM users WHERE username = ? AND userId != ?',
        [username, id]
      );

      if (usernameCheck.length > 0) {
        return error(res, '用户名已被使用', 400);
      }
    }

    // 构建更新字段
    const updates = [];
    const values = [];

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (realName !== undefined) {
      updates.push('realName = ?');
      values.push(realName || null);
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone || null);
    }

    if (updates.length === 0) {
      return error(res, '没有需要更新的字段', 400);
    }

    values.push(id);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE userId = ?`,
      values
    );

    // 获取更新后的数据
    const [updated] = await pool.execute(
      `SELECT userId, username, realName, phone, createdAt, updatedAt
       FROM users WHERE userId = ?`,
      [id]
    );

    return success(res, updated[0], '维修工信息更新成功');
  } catch (err) {
    console.error('更新维修工信息错误:', err);
    return error(res, '更新维修工信息失败', 500);
  }
};

// 删除维修工 (仅 super_admin)
const deleteRepairman = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查维修工是否存在
    const [existing] = await pool.execute(
      'SELECT userId FROM users WHERE userId = ? AND role = ?',
      [id, 'repairman']
    );

    if (existing.length === 0) {
      return error(res, '维修工不存在', 404);
    }

    // 检查是否有未完成的订单 (status 为 pending 或 processing 且 adminId 为该维修工)
    const [incompleteOrders] = await pool.execute(
      `SELECT COUNT(*) as count FROM repairOrders
       WHERE adminId = ? AND status IN ('pending', 'processing')`,
      [id]
    );

    if (incompleteOrders[0].count > 0) {
      return error(res, `该维修工有 ${incompleteOrders[0].count} 个未完成的订单，无法删除`, 400);
    }

    // 删除维修工
    await pool.execute(
      'DELETE FROM users WHERE userId = ?',
      [id]
    );

    return success(res, null, '维修工删除成功');
  } catch (err) {
    console.error('删除维修工错误:', err);
    return error(res, '删除维修工失败', 500);
  }
};

module.exports = {
  createRepairman,
  getAllRepairmen,
  updateRepairman,
  deleteRepairman
};
