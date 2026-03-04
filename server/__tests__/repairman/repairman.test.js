const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../middleware/auth');

describe('Repairman Management API', () => {
  let superAdminToken;
  let studentToken;
  let testRepairmanId;

  const superAdmin = {
    username: 'superadmin_test',
    password: 'admin123',
    role: 'super_admin',
    realName: '超级管理员'
  };

  const student = {
    username: 'student_repairman_test',
    password: 'student123',
    role: 'student',
    realName: '测试学生'
  };

  const testRepairman = {
    username: 'test_repairman_1',
    password: 'repair123',
    realName: '测试维修工',
    phone: '13800138001'
  };

  beforeAll(async () => {
    const hashedAdminPassword = await bcrypt.hash(superAdmin.password, 10);
    try {
      await pool.execute(
        'INSERT INTO users (username, password, role, realName) VALUES (?, ?, ?, ?)',
        [superAdmin.username, hashedAdminPassword, superAdmin.role, superAdmin.realName]
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
    }

    const hashedStudentPassword = await bcrypt.hash(student.password, 10);
    try {
      await pool.execute(
        'INSERT INTO users (username, password, role, realName) VALUES (?, ?, ?, ?)',
        [student.username, hashedStudentPassword, student.role, student.realName]
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
    }

    const [superAdminRows] = await pool.execute(
      'SELECT userId FROM users WHERE username = ?',
      [superAdmin.username]
    );
    const [studentRows] = await pool.execute(
      'SELECT userId FROM users WHERE username = ?',
      [student.username]
    );

    const superAdminId = superAdminRows[0]?.userId || 1;
    const studentId = studentRows[0]?.userId || 2;

    superAdminToken = jwt.sign(
      { userId: superAdminId, username: superAdmin.username, role: superAdmin.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    studentToken = jwt.sign(
      { userId: studentId, username: student.username, role: student.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    try {
      await pool.execute('DELETE FROM users WHERE username LIKE ?', ['test_repairman_%']);
      await pool.execute('DELETE FROM users WHERE username = ?', [superAdmin.username]);
      await pool.execute('DELETE FROM users WHERE username = ?', [student.username]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Authentication & Authorization', () => {
    test('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/api/super-admin/repairman');
      
      expect(response.status).toBe(401);
    });

    test('should return 403 when student tries to access', async () => {
      const response = await request(app)
        .get('/api/super-admin/repairman')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('POST /api/super-admin/repairman - Create repairman', () => {
    test('should create repairman successfully', async () => {
      const response = await request(app)
        .post('/api/super-admin/repairman')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(testRepairman);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('code', 201);
      expect(response.body.data).toHaveProperty('username', testRepairman.username);
      expect(response.body.data).toHaveProperty('role', 'repairman');
      expect(response.body.data).not.toHaveProperty('password');
      
      testRepairmanId = response.body.data.userId;
    });

    test('should return 400 when username is missing', async () => {
      const response = await request(app)
        .post('/api/super-admin/repairman')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ password: 'test123' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('用户名和密码为必填项');
    });

    test('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/super-admin/repairman')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ username: 'new_repairman' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('用户名和密码为必填项');
    });

    test('should return 400 when username already exists', async () => {
      const response = await request(app)
        .post('/api/super-admin/repairman')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(testRepairman);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('用户名已存在');
    });
  });

  describe('GET /api/super-admin/repairman - Get all repairmen', () => {
    test('should return list of repairmen', async () => {
      const response = await request(app)
        .get('/api/super-admin/repairman')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 200);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const repairman = response.body.data.find(r => r.username === testRepairman.username);
      expect(repairman).toBeDefined();
      expect(repairman).not.toHaveProperty('password');
    });
  });

  describe('PUT /api/super-admin/repairman/:id - Update repairman', () => {
    test('should update repairman info successfully', async () => {
      const response = await request(app)
        .put(`/api/super-admin/repairman/${testRepairmanId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          realName: '更新后的维修工',
          phone: '13900139000'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('realName', '更新后的维修工');
      expect(response.body.data).toHaveProperty('phone', '13900139000');
    });

    test('should return 404 when repairman not found', async () => {
      const response = await request(app)
        .put('/api/super-admin/repairman/99999')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ realName: '不存在' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('维修工不存在');
    });

    test('should return 400 when no fields to update', async () => {
      const response = await request(app)
        .put(`/api/super-admin/repairman/${testRepairmanId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('没有需要更新的字段');
    });

    test('should update password successfully', async () => {
      const response = await request(app)
        .put(`/api/super-admin/repairman/${testRepairmanId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ password: 'newpassword123' });

      expect(response.status).toBe(200);

      const [users] = await pool.execute(
        'SELECT password FROM users WHERE userId = ?',
        [testRepairmanId]
      );
      const isMatch = await bcrypt.compare('newpassword123', users[0].password);
      expect(isMatch).toBe(true);
    });
  });

  describe('DELETE /api/super-admin/repairman/:id - Delete repairman', () => {
    test('should return 404 when repairman not found', async () => {
      const response = await request(app)
        .delete('/api/super-admin/repairman/99999')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('维修工不存在');
    });

    test('should delete repairman without incomplete orders', async () => {
      const createResponse = await request(app)
        .post('/api/super-admin/repairman')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          username: 'test_repairman_to_delete',
          password: 'delete123',
          realName: '待删除维修工'
        });

      const deleteId = createResponse.body.data.userId;

      const response = await request(app)
        .delete(`/api/super-admin/repairman/${deleteId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('维修工删除成功');

      const [users] = await pool.execute(
        'SELECT * FROM users WHERE userId = ?',
        [deleteId]
      );
      expect(users.length).toBe(0);
    });

    test.todo('should return 400 when repairman has incomplete orders');
  });
});
