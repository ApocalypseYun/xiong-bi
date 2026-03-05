const pool = require('../config/database');
const { success, error } = require('../utils/response');
const XLSX = require('xlsx');

// 获取住户列表（支持按学号搜索）
const getResidents = async (req, res) => {
  try {
    const { studentId } = req.query;
    let sql = 'SELECT * FROM residents';
    const params = [];
    if (studentId) {
      sql += ' WHERE studentId LIKE ?';
      params.push(`%${studentId}%`);
    }
    sql += ' ORDER BY createdAt DESC';
    const [rows] = await pool.execute(sql, params);
    return success(res, rows, '获取住户列表成功');
  } catch (err) {
    console.error('获取住户列表错误:', err);
    return error(res, '获取住户列表失败', 500);
  }
};

// 新增住户
const createResident = async (req, res) => {
  try {
    const { studentId, name, phone, building, roomNumber, qqEmail } = req.body;
    if (!studentId || !name || !phone || !building || !roomNumber || !qqEmail) {
      return error(res, '所有字段均为必填', 400);
    }
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailReg.test(qqEmail)) {
      return error(res, '邮箱格式不正确', 400);
    }
    const [exist] = await pool.execute('SELECT residentId FROM residents WHERE studentId = ?', [studentId]);
    if (exist.length > 0) {
      return error(res, '该学号已存在', 400);
    }
    const [result] = await pool.execute(
      'INSERT INTO residents (studentId, name, phone, building, roomNumber, qqEmail) VALUES (?, ?, ?, ?, ?, ?)',
      [studentId, name, phone, building, roomNumber, qqEmail]
    );
    return success(res, { residentId: result.insertId }, '添加住户成功');
  } catch (err) {
    console.error('添加住户错误:', err);
    return error(res, '添加住户失败', 500);
  }
};

// 编辑住户
const updateResident = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, building, roomNumber, qqEmail } = req.body;
    if (!name || !phone || !building || !roomNumber || !qqEmail) {
      return error(res, '姓名、手机号、栋数、寝室号、QQ邮箱均为必填', 400);
    }
    const [exist] = await pool.execute('SELECT residentId FROM residents WHERE residentId = ?', [id]);
    if (exist.length === 0) return error(res, '住户不存在', 404);
    await pool.execute(
      'UPDATE residents SET name=?, phone=?, building=?, roomNumber=?, qqEmail=? WHERE residentId=?',
      [name, phone, building, roomNumber, qqEmail, id]
    );
    return success(res, null, '更新住户成功');
  } catch (err) {
    console.error('更新住户错误:', err);
    return error(res, '更新住户失败', 500);
  }
};

// 删除住户
const deleteResident = async (req, res) => {
  try {
    const { id } = req.params;
    const [exist] = await pool.execute('SELECT residentId, isRegistered FROM residents WHERE residentId = ?', [id]);
    if (exist.length === 0) return error(res, '住户不存在', 404);
    if (exist[0].isRegistered) return error(res, '该住户已注册账号，无法删除', 400);
    await pool.execute('DELETE FROM residents WHERE residentId = ?', [id]);
    return success(res, null, '删除住户成功');
  } catch (err) {
    console.error('删除住户错误:', err);
    return error(res, '删除住户失败', 500);
  }
};

// Excel 批量导入
const importResidents = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!req.file) return error(res, '请上传 Excel 文件', 400);
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    // 期望列: 学号、姓名、手机号、栋数、寝室号、QQ邮箱
    const required = ['学号', '姓名', '手机号', '栋数', '寝室号', 'QQ邮箱'];
    if (rows.length === 0) return error(res, 'Excel 文件为空', 400);
    const firstRow = rows[0];
    for (const col of required) {
      if (!(col in firstRow)) return error(res, `Excel 缺少列: ${col}`, 400);
    }

    await connection.beginTransaction();
    let inserted = 0, skipped = 0;
    for (const row of rows) {
      const { 学号: studentId, 姓名: name, 手机号: phone, 栋数: building, 寝室号: roomNumber, 'QQ邮箱': qqEmail } = row;
      if (!studentId || !name || !phone || !building || !roomNumber || !qqEmail) { skipped++; continue; }
      const [exist] = await connection.execute('SELECT residentId FROM residents WHERE studentId = ?', [String(studentId)]);
      if (exist.length > 0) { skipped++; continue; }
      await connection.execute(
        'INSERT INTO residents (studentId, name, phone, building, roomNumber, qqEmail) VALUES (?, ?, ?, ?, ?, ?)',
        [String(studentId), String(name), String(phone), String(building), String(roomNumber), String(qqEmail)]
      );
      inserted++;
    }
    await connection.commit();
    return success(res, { inserted, skipped }, `导入完成：成功 ${inserted} 条，跳过 ${skipped} 条`);
  } catch (err) {
    await connection.rollback();
    console.error('导入住户错误:', err);
    return error(res, '导入失败', 500);
  } finally {
    connection.release();
  }
};

module.exports = { getResidents, createResident, updateResident, deleteResident, importResidents };
