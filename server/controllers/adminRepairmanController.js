const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { success, error } = require('../utils/response');

// 获取维修工列表
const getRepairmen = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT userId, username, realName, phone, createdAt FROM users WHERE role = 'repairman' ORDER BY createdAt DESC"
    );
    return success(res, rows, '获取维修工列表成功');
  } catch (err) {
    console.error('获取维修工列表错误:', err);
    return error(res, '获取维修工列表失败', 500);
  }
};

// 新增维修工
const createRepairman = async (req, res) => {
  try {
    const { username, password, realName, phone } = req.body;
    if (!username || !password || !realName || !phone) {
      return error(res, '用户名、密码、姓名、手机号均为必填', 400);
    }
    if (password.length < 6) return error(res, '密码不能少于6位', 400);
    const [exist] = await pool.execute('SELECT userId FROM users WHERE username = ?', [username]);
    if (exist.length > 0) return error(res, '用户名已存在', 400);
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (username, password, role, realName, phone) VALUES (?, ?, 'repairman', ?, ?)",
      [username, hashed, realName, phone]
    );
    return success(res, { userId: result.insertId }, '添加维修工成功');
  } catch (err) {
    console.error('添加维修工错误:', err);
    return error(res, '添加维修工失败', 500);
  }
};

// 编辑维修工
const updateRepairman = async (req, res) => {
  try {
    const { id } = req.params;
    const { realName, phone, password } = req.body;
    if (!realName || !phone) return error(res, '姓名和手机号均为必填', 400);
    const [exist] = await pool.execute("SELECT userId FROM users WHERE userId = ? AND role = 'repairman'", [id]);
    if (exist.length === 0) return error(res, '维修工不存在', 404);
    if (password) {
      if (password.length < 6) return error(res, '密码不能少于6位', 400);
      const hashed = await bcrypt.hash(password, 10);
      await pool.execute('UPDATE users SET realName=?, phone=?, password=? WHERE userId=?', [realName, phone, hashed, id]);
    } else {
      await pool.execute('UPDATE users SET realName=?, phone=? WHERE userId=?', [realName, phone, id]);
    }
    return success(res, null, '更新维修工成功');
  } catch (err) {
    console.error('更新维修工错误:', err);
    return error(res, '更新维修工失败', 500);
  }
};

// 删除维修工
const deleteRepairman = async (req, res) => {
  try {
    const { id } = req.params;
    const [exist] = await pool.execute("SELECT userId FROM users WHERE userId = ? AND role = 'repairman'", [id]);
    if (exist.length === 0) return error(res, '维修工不存在', 404);
    await pool.execute('DELETE FROM users WHERE userId = ?', [id]);
    return success(res, null, '删除维修工成功');
  } catch (err) {
    console.error('删除维修工错误:', err);
    return error(res, '删除维修工失败', 500);
  }
};

module.exports = { getRepairmen, createRepairman, updateRepairman, deleteRepairman };
