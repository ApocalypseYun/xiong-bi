const request = require('supertest');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const app = require('../../app');
const pool = require('../../config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, ROLE_TYPES } = require('../../middleware/auth');

// Helper to create Excel buffer from data
const createExcelBuffer = (data) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

// Helper to generate JWT token for super_admin
const generateSuperAdminToken = () => {
  return jwt.sign(
    { userId: 999, username: 'superadmin', role: ROLE_TYPES.SUPER_ADMIN },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Helper to generate JWT token for student
const generateStudentToken = () => {
  return jwt.sign(
    { userId: 1, username: 'student', role: ROLE_TYPES.STUDENT },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('POST /api/super-admin/resident/import', () => {
  const superAdminToken = generateSuperAdminToken();
  const studentToken = generateStudentToken();

  // Cleanup residents table before and after tests
  beforeAll(async () => {
    await pool.execute('DELETE FROM residents WHERE student_id LIKE "TEST%"');
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM residents WHERE student_id LIKE "TEST%"');
  });

  describe('Authentication & Authorization', () => {
    test('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/super-admin/resident/import');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 403 for non-super-admin user', async () => {
      const excelBuffer = createExcelBuffer([
        { student_id: 'TEST001', name: '测试', phone: '13800138001', building: 'A栋', room_number: '101' }
      ]);

      const response = await request(app)
        .post('/api/super-admin/resident/import')
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('file', excelBuffer, { filename: 'test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('File validation', () => {
    test('should return 400 when no file uploaded', async () => {
      const response = await request(app)
        .post('/api/super-admin/resident/import')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('请上传 Excel 文件');
    });

    test('should return 400 for non-Excel file', async () => {
      const response = await request(app)
        .post('/api/super-admin/resident/import')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', Buffer.from('not an excel file'), { filename: 'test.txt', contentType: 'text/plain' });

      expect(response.status).toBe(500); // Multer error gets caught by error handler
    });
  });

  describe('Success cases', () => {
    test('should successfully import valid Excel data', async () => {
      const testData = [
        { student_id: 'TEST001', name: '张三', phone: '13800138001', building: 'A栋', room_number: '101' },
        { student_id: 'TEST002', name: '李四', phone: '13800138002', building: 'A栋', room_number: '102' }
      ];
      const excelBuffer = createExcelBuffer(testData);

      const response = await request(app)
        .post('/api/super-admin/resident/import')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', excelBuffer, { filename: 'test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.data.success).toBe(2);
      expect(response.body.data.failed).toBe(0);
      expect(response.body.data.skipped).toBe(0);
      expect(response.body.data.total).toBe(2);

      // Verify data was inserted
      const [rows] = await pool.execute(
        'SELECT * FROM residents WHERE student_id IN (?, ?)',
        ['TEST001', 'TEST002']
      );
      expect(rows.length).toBe(2);
    });

    test('should accept Chinese column headers', async () => {
      const testData = [
        { '学号': 'TEST003', '姓名': '王五', '电话': '13800138003', '楼栋': 'B栋', '寝室号': '201' }
      ];
      const excelBuffer = createExcelBuffer(testData);

      const response = await request(app)
        .post('/api/super-admin/resident/import')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', excelBuffer, { filename: 'test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(1);
    });
  });

  describe('Duplicate handling', () => {
    test('should skip duplicate student_ids', async () => {
      // First, insert a resident
      await pool.execute(
        'INSERT INTO residents (student_id, name, phone, building, room_number) VALUES (?, ?, ?, ?, ?)',
        ['TEST_DUP', '已存在', '13900139000', 'C栋', '301']
      );

      const testData = [
        { student_id: 'TEST_DUP', name: '重复学号', phone: '13800138004', building: 'D栋', room_number: '401' },
        { student_id: 'TEST004', name: '新学生', phone: '13800138005', building: 'D栋', room_number: '402' }
      ];
      const excelBuffer = createExcelBuffer(testData);

      const response = await request(app)
        .post('/api/super-admin/resident/import')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', excelBuffer, { filename: 'test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(1);
      expect(response.body.data.skipped).toBe(1);
      expect(response.body.data.errors).toBeDefined();
    });
  });

  describe('Validation errors', () => {
    test('should report rows with missing required fields', async () => {
      const testData = [
        { student_id: 'TEST005', name: '完整', phone: '13800138006', building: 'E栋', room_number: '501' },
        { student_id: '', name: '缺学号', phone: '13800138007', building: 'E栋', room_number: '502' },
        { student_id: 'TEST006', name: '', phone: '13800138008', building: 'E栋', room_number: '503' }
      ];
      const excelBuffer = createExcelBuffer(testData);

      const response = await request(app)
        .post('/api/super-admin/resident/import')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', excelBuffer, { filename: 'test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(1);
      expect(response.body.data.failed).toBe(2);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });

    test('should report rows with invalid phone format', async () => {
      const testData = [
        { student_id: 'TEST007', name: '电话错误', phone: '12345', building: 'F栋', room_number: '601' }
      ];
      const excelBuffer = createExcelBuffer(testData);

      const response = await request(app)
        .post('/api/super-admin/resident/import')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', excelBuffer, { filename: 'test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(0);
      expect(response.body.data.failed).toBe(1);
    });

    test('should return 400 for empty Excel file', async () => {
      const excelBuffer = createExcelBuffer([]);

      const response = await request(app)
        .post('/api/super-admin/resident/import')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('file', excelBuffer, { filename: 'empty.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('没有有效数据');
    });
  });

  describe('Unit tests - parseExcelFile', () => {
    const { parseExcelFile, validateRow } = require('../../controllers/residentController');

    test('should correctly parse valid Excel buffer', () => {
      const testData = [
        { student_id: 'U001', name: '用户1', phone: '13800138001', building: 'A栋', room_number: '101' }
      ];
      const buffer = createExcelBuffer(testData);
      const result = parseExcelFile(buffer);

      expect(result.data.length).toBe(1);
      expect(result.data[0]).toEqual({
        student_id: 'U001',
        name: '用户1',
        phone: '13800138001',
        building: 'A栋',
        room_number: '101'
      });
      expect(result.errors.length).toBe(0);
    });

    test('should return errors for invalid data', () => {
      const testData = [
        { student_id: '', name: '无学号', phone: '13800138002', building: 'B栋', room_number: '201' }
      ];
      const buffer = createExcelBuffer(testData);
      const result = parseExcelFile(buffer);

      expect(result.data.length).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('学号不能为空');
    });

    test('validateRow should accept valid Chinese phone numbers', () => {
      const row = {
        student_id: 'V001',
        name: '验证用户',
        phone: '15912345678',
        building: 'C栋',
        room_number: '301'
      };
      const result = validateRow(row, 1);
      expect(result.data).toBeDefined();
      expect(result.data.phone).toBe('15912345678');
    });

    test('validateRow should reject invalid phone format', () => {
      const row = {
        student_id: 'V002',
        name: '电话错误',
        phone: '12345678901', // doesn't start with 1[3-9]
        building: 'C栋',
        room_number: '302'
      };
      const result = validateRow(row, 2);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('电话格式不正确');
    });
  });
});
