const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { success, error } = require('../utils/response');
const { JWT_SECRET } = require('../middleware/auth');

// 用户注册
const register = async (req, res) => {
  try {
    const { username, password, confirmPassword, role, realName, phone, roomNumber, building } = req.body;

    // 输入验证
    if (!username || !password || !confirmPassword) {
      return error(res, '用户名、密码和确认密码不能为空', 400);
    }

    if (password !== confirmPassword) {
      return error(res, '两次输入的密码不一致', 400);
    }

    if (password.length < 6) {
      return error(res, '密码长度不能少于6位', 400);
    }

    // 验证角色
    const validRoles = ['student', 'admin'];
    const userRole = role || 'student';
    if (!validRoles.includes(userRole)) {
      return error(res, '无效的用户角色', 400);
    }

    // 检查用户名是否已存在
    const [existingUsers] = await pool.execute(
      'SELECT userId FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return error(res, '用户名已存在', 400);
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入用户
    const [result] = await pool.execute(
      `INSERT INTO users (username, password, role, realName, phone, roomNumber, building) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, userRole, realName || null, phone || null, roomNumber || null, building || null]
    );

    return success(res, { userId: result.insertId, username, role: userRole }, '注册成功');
  } catch (err) {
    console.error('注册错误:', err);
    return error(res, '注册失败，请稍后重试', 500);
  }
};

// 用户登录
const login = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // 输入验证
    if (!username || !password) {
      return error(res, '用户名和密码不能为空', 400);
    }

    // 查询用户
    const [users] = await pool.execute(
      'SELECT userId, username, password, role, realName FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return error(res, '用户名或密码错误', 401);
    }

    const user = users[0];

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return error(res, '用户名或密码错误', 401);
    }

    // 验证角色（如果指定了角色）
    if (role && user.role !== role) {
      return error(res, '角色不匹配', 401);
    }

    // 生成 JWT Token
    const token = jwt.sign(
      { userId: user.userId, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return success(res, {
      token,
      user: {
        userId: user.userId,
        username: user.username,
        role: user.role,
        realName: user.realName
      }
    }, '登录成功');
  } catch (err) {
    console.error('登录错误:', err);
    return error(res, '登录失败，请稍后重试', 500);
  }
};

// 重置密码
const resetPassword = async (req, res) => {
  try {
    const { username, newPassword, confirmPassword } = req.body;

    // 输入验证
    if (!username || !newPassword || !confirmPassword) {
      return error(res, '用户名、新密码和确认密码不能为空', 400);
    }

    if (newPassword !== confirmPassword) {
      return error(res, '两次输入的密码不一致', 400);
    }

    if (newPassword.length < 6) {
      return error(res, '密码长度不能少于6位', 400);
    }

    // 检查用户是否存在
    const [users] = await pool.execute(
      'SELECT userId FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return error(res, '用户不存在', 404);
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await pool.execute(
      'UPDATE users SET password = ? WHERE username = ?',
      [hashedPassword, username]
    );

    return success(res, null, '密码重置成功');
  } catch (err) {
    console.error('密码重置错误:', err);
    return error(res, '密码重置失败，请稍后重试', 500);
  }
};

module.exports = {
  register,
  login,
  resetPassword
};
