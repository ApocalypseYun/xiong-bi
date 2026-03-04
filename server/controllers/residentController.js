const XLSX = require('xlsx');
const pool = require('../config/database');
const { success, error } = require('../utils/response');

/**
 * 创建住户
 * POST /api/super-admin/resident
 */
const createResident = async (req, res) => {
  try {
    const { student_id, name, phone, building, room_number } = req.body;

    // 验证必填字段
    if (!student_id || !name || !phone || !building || !room_number) {
      return error(res, '所有字段都是必填的', 400);
    }

    // 检查 student_id 是否已存在
    const [existing] = await pool.execute(
      'SELECT id FROM residents WHERE student_id = ?',
      [student_id]
    );

    if (existing.length > 0) {
      return error(res, '该学号已存在', 400);
    }

    // 插入新住户
    const [result] = await pool.execute(
      `INSERT INTO residents (student_id, name, phone, building, room_number)
       VALUES (?, ?, ?, ?, ?)`,
      [student_id, name, phone, building, room_number]
    );

    return success(res, {
      id: result.insertId,
      student_id,
      name,
      phone,
      building,
      room_number
    }, '创建住户成功');
  } catch (err) {
    console.error('创建住户错误:', err);
    return error(res, '创建住户失败', 500);
  }
};

/**
 * 获取住户列表（支持搜索和分页）
 * GET /api/super-admin/resident
 * Query: ?studentId=&page=&limit=
 */
const getResidents = async (req, res) => {
  try {
    const { studentId, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = 'SELECT * FROM residents WHERE 1=1';
    const params = [];

    // 搜索条件
    if (studentId) {
      sql += ' AND student_id LIKE ?';
      params.push(`%${studentId}%`);
    }

    // 获取总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await pool.execute(countSql, params);
    const total = countResult[0].total;

    // 分页查询 - LIMIT/OFFSET 需直接拼接到 SQL，不使用占位符
    const limitNum = parseInt(limit);
    const offsetNum = offset;
    sql += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [residents] = await pool.execute(sql, params);

    return success(res, {
      list: residents,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    }, '获取住户列表成功');
  } catch (err) {
    console.error('获取住户列表错误:', err);
    return error(res, '获取住户列表失败', 500);
  }
};

/**
 * 更新住户
 * PUT /api/super-admin/resident/:id
 */
const updateResident = async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id, name, phone, building, room_number } = req.body;

    // 检查住户是否存在
    const [existing] = await pool.execute(
      'SELECT id, student_id FROM residents WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return error(res, '住户不存在', 404);
    }

    // 如果修改了 student_id，检查新学号是否已被使用
    if (student_id && student_id !== existing[0].student_id) {
      const [duplicate] = await pool.execute(
        'SELECT id FROM residents WHERE student_id = ? AND id != ?',
        [student_id, id]
      );

      if (duplicate.length > 0) {
        return error(res, '该学号已被其他住户使用', 400);
      }
    }

    // 构建更新字段
    const updates = [];
    const values = [];

    if (student_id) {
      updates.push('student_id = ?');
      values.push(student_id);
    }
    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (building) {
      updates.push('building = ?');
      values.push(building);
    }
    if (room_number) {
      updates.push('room_number = ?');
      values.push(room_number);
    }

    if (updates.length === 0) {
      return error(res, '没有要更新的字段', 400);
    }

    values.push(id);

    await pool.execute(
      `UPDATE residents SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // 获取更新后的数据
    const [updated] = await pool.execute(
      'SELECT * FROM residents WHERE id = ?',
      [id]
    );

    return success(res, updated[0], '更新住户成功');
  } catch (err) {
    console.error('更新住户错误:', err);
    return error(res, '更新住户失败', 500);
  }
};

/**
 * 删除住户（检查是否已注册）
 * DELETE /api/super-admin/resident/:id
 */
const deleteResident = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查住户是否存在
    const [resident] = await pool.execute(
      'SELECT student_id FROM residents WHERE id = ?',
      [id]
    );

    if (resident.length === 0) {
      return error(res, '住户不存在', 404);
    }

    // 检查 users 表中是否有对应学号的注册用户
    const [registeredUser] = await pool.execute(
      'SELECT userId FROM users WHERE username = ?',
      [resident[0].student_id]
    );

    if (registeredUser.length > 0) {
      return error(res, '该住户已注册账号，无法删除', 400);
    }

    // 删除住户
    await pool.execute('DELETE FROM residents WHERE id = ?', [id]);

    return success(res, null, '删除住户成功');
  } catch (err) {
    console.error('删除住户错误:', err);
    return error(res, '删除住户失败', 500);
  }
};

// Constants for validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 5000;

/**
 * Parse Excel file and extract resident data
 * @param {Buffer} buffer - Excel file buffer
 * @returns {Object} - { data: Array, errors: Array }
 */
const parseExcelFile = (buffer) => {
  const result = { data: [], errors: [] };

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with header mapping
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    if (jsonData.length === 0) {
      result.errors.push({ row: 0, message: 'Excel 文件为空或格式不正确' });
      return result;
    }

    // Validate and transform each row
    jsonData.forEach((row, index) => {
      const rowNum = index + 2; // Excel row number (1-based, +1 for header)

      // Normalize column names (case-insensitive, handle Chinese headers)
      const normalizedRow = normalizeRowKeys(row);

      // Validate required fields
      const validation = validateRow(normalizedRow, rowNum);
      if (validation.error) {
        result.errors.push(validation.error);
        return;
      }

      result.data.push(validation.data);
    });

    return result;
  } catch (err) {
    result.errors.push({ row: 0, message: `解析 Excel 文件失败: ${err.message}` });
    return result;
  }
};

/**
 * Normalize row keys to match expected column names
 */
const normalizeRowKeys = (row) => {
  const columnMapping = {
    // English variations
    'student_id': 'student_id',
    'studentid': 'student_id',
    'student id': 'student_id',
    '学号': 'student_id',
    'name': 'name',
    '姓名': 'name',
    'phone': 'phone',
    '电话': 'phone',
    '联系电话': 'phone',
    '手机': 'phone',
    'building': 'building',
    '楼栋': 'building',
    '宿舍楼': 'building',
    'room_number': 'room_number',
    'roomnumber': 'room_number',
    'room': 'room_number',
    '寝室号': 'room_number',
    '宿舍号': 'room_number',
    '房号': 'room_number'
  };

  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    const lowerKey = key.toLowerCase().trim();
    const mappedKey = columnMapping[lowerKey] || columnMapping[key] || lowerKey;
    normalized[mappedKey] = value ? String(value).trim() : '';
  }
  return normalized;
};

/**
 * Validate a single row of data
 */
const validateRow = (row, rowNum) => {
  const errors = [];

  // Check required fields
  if (!row.student_id) {
    errors.push('学号不能为空');
  }
  if (!row.name) {
    errors.push('姓名不能为空');
  }
  if (!row.phone) {
    errors.push('电话不能为空');
  }
  if (!row.building) {
    errors.push('楼栋不能为空');
  }
  if (!row.room_number) {
    errors.push('寝室号不能为空');
  }

  // Validate phone format (Chinese mobile)
  if (row.phone && !/^1[3-9]\d{9}$/.test(row.phone)) {
    errors.push('电话格式不正确（应为11位手机号）');
  }

  if (errors.length > 0) {
    return {
      error: { row: rowNum, message: errors.join('; '), student_id: row.student_id }
    };
  }

  return {
    data: {
      student_id: row.student_id,
      name: row.name,
      phone: row.phone,
      building: row.building,
      room_number: row.room_number
    }
  };
};

/**
 * Import residents from Excel file
 * POST /api/super-admin/resident/import
 */
const importResidents = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // Check if file was uploaded
    if (!req.file) {
      return error(res, '请上传 Excel 文件', 400);
    }

    // Validate file size
    if (req.file.size > MAX_FILE_SIZE) {
      return error(res, `文件大小超过限制（最大 5MB），当前文件: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`, 400);
    }

    // Parse Excel file
    const { data: residents, errors: parseErrors } = parseExcelFile(req.file.buffer);

    // Check row count
    if (residents.length > MAX_ROWS) {
      return error(res, `数据行数超过限制（最大 ${MAX_ROWS} 行），当前: ${residents.length} 行`, 400);
    }

    // If no valid residents but has parse errors, return results with errors
    // If no valid residents but has parse errors
    if (residents.length === 0 && parseErrors.length > 0) {
      // Check if it's an empty file error (should return 400)
      const isEmptyFile = parseErrors.some(e => e.message && e.message.includes('Excel 文件为空'));
      if (isEmptyFile) {
        return error(res, 'Excel 文件解析失败，没有有效数据', 400);
      }
      // Otherwise return 200 with error details
      return success(res, {
        success: 0,
        failed: parseErrors.length,
        skipped: 0,
        total: 0,
        errors: parseErrors
      }, `导入完成：成功 0 条，跳过重复 0 条，失败 ${parseErrors.length} 条`);
    }

    // Start transaction for batch insert
    await connection.beginTransaction();

    const results = {
      success: 0,
      failed: parseErrors.length,
      skipped: 0,
      errors: [...parseErrors]
    };

    // Get existing student_ids for duplicate check
    if (residents.length > 0) {
      // Build IN clause properly for mysql2
      const placeholders = residents.map(() => '?').join(',');
      const [existingRows] = await connection.execute(
        `SELECT student_id FROM residents WHERE student_id IN (${placeholders})`,
        residents.map(r => r.student_id)
      );
      const existingIds = new Set(existingRows.map(r => r.student_id));

      // Separate new and duplicate records
      const newResidents = [];
      const duplicates = [];

      for (const resident of residents) {
        if (existingIds.has(resident.student_id)) {
          duplicates.push(resident);
          results.skipped++;
        } else {
          newResidents.push(resident);
        }
      }

      // Batch insert new residents
      if (newResidents.length > 0) {
        const placeholders = newResidents.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const values = newResidents.flatMap(r => [
          r.student_id,
          r.name,
          r.phone,
          r.building,
          r.room_number
        ]);

        try {
          await connection.execute(
            `INSERT INTO residents (student_id, name, phone, building, room_number) VALUES ${placeholders}`,
            values
          );
          results.success = newResidents.length;
        } catch (insertErr) {
          // If batch insert fails, try individual inserts to identify problematic rows
          for (const resident of newResidents) {
            try {
              await connection.execute(
                'INSERT INTO residents (student_id, name, phone, building, room_number) VALUES (?, ?, ?, ?, ?)',
                [resident.student_id, resident.name, resident.phone, resident.building, resident.room_number]
              );
              results.success++;
            } catch (err) {
              results.failed++;
              results.errors.push({
                row: resident.student_id,
                message: `插入失败: ${err.message}`
              });
            }
          }
        }
      }

      // Add duplicate info to response
      if (duplicates.length > 0) {
        results.errors.push({
          message: `跳过 ${duplicates.length} 个重复学号`,
          duplicates: duplicates.map(d => d.student_id)
        });
      }
    }

    // Commit transaction
    await connection.commit();

    return success(res, {
      success: results.success,
      failed: results.failed,
      skipped: results.skipped,
      total: residents.length,
      errors: results.errors.length > 0 ? results.errors : undefined
    }, `导入完成：成功 ${results.success} 条，跳过重复 ${results.skipped} 条，失败 ${results.failed} 条`);

  } catch (err) {
    await connection.rollback();
    console.error('导入居民数据错误:', err);
    return error(res, `导入失败: ${err.message}`, 500);
  } finally {
    connection.release();
  }
};


module.exports = {
  createResident,
  getResidents,
  updateResident,
  deleteResident,
  importResidents,
  parseExcelFile,
  validateRow,
  MAX_FILE_SIZE,
  MAX_ROWS
};
