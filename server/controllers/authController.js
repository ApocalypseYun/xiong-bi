const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { success, error } = require('../utils/response');
const { JWT_SECRET } = require('../middleware/auth');

// 用户注册
const register = async (req, res) => {
  try {
    const { username, password, confirmPassword, realName, phone, roomNumber, building, qqEmail } = req.body;

    if (!username || !password || !confirmPassword || !realName || !phone || !roomNumber || !building || !qqEmail) {
      return error(res, '所有字段均为必填', 400);
    }
    if (password !== confirmPassword) return error(res, '两次输入的密码不一致', 400);
    if (password.length < 6) return error(res, '密码长度不能少于6位', 400);

    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailReg.test(qqEmail)) return error(res, 'QQ邮箱格式不正确', 400);

    // 核对住户表（学号即用户名）
    const [residents] = await pool.execute(
      'SELECT residentId, isRegistered FROM residents WHERE studentId=? AND name=? AND phone=? AND building=? AND roomNumber=? AND qqEmail=?',
      [username, realName, phone, building, roomNumber, qqEmail]
    );
    if (residents.length === 0) return error(res, '个人信息与住户记录不匹配，请核对后重试', 400);
    if (residents[0].isRegistered) return error(res, '该学号已注册账号', 400);

    // 检查 users 表是否重复
    const [existingUsers] = await pool.execute('SELECT userId FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) return error(res, '用户名已存在', 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, role, realName, phone, roomNumber, building) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, 'student', realName, phone, roomNumber, building]
    );

    // 标记住户已注册
    await pool.execute('UPDATE residents SET isRegistered = TRUE WHERE residentId = ?', [residents[0].residentId]);

    return success(res, { userId: result.insertId, username, role: 'student' }, '注册成功');
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
    const { username, realName, phone, building, roomNumber, qqEmail, newPassword, confirmPassword } = req.body;

    if (!username || !realName || !phone || !building || !roomNumber || !qqEmail || !newPassword || !confirmPassword) {
      return error(res, '所有字段均为必填', 400);
    }
    if (newPassword !== confirmPassword) return error(res, '两次输入的密码不一致', 400);
    if (newPassword.length < 6) return error(res, '密码长度不能少于6位', 400);

    // 核对住户表
    const [residents] = await pool.execute(
      'SELECT residentId FROM residents WHERE studentId=? AND name=? AND phone=? AND building=? AND roomNumber=? AND qqEmail=?',
      [username, realName, phone, building, roomNumber, qqEmail]
    );
    if (residents.length === 0) return error(res, '个人信息与住户记录不匹配', 400);

    const [users] = await pool.execute('SELECT userId FROM users WHERE username = ?', [username]);
    if (users.length === 0) return error(res, '该学号尚未注册账号', 404);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username]);

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
