const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/database');
const jwt = require('jsonwebtoken');

describe('Resident API - /api/super-admin/resident', () => {
  const superAdminToken = jwt.sign(
    { userId: 1, role: 'super_admin' },
    process.env.JWT_SECRET || 'your-secret-key'
  );
  
  const studentToken = jwt.sign(
    { userId: 2, role: 'student' },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  const repairmanToken = jwt.sign(
    { userId: 3, role: 'repairman' },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  const testResident = {
    student_id: 'TEST2024001',
    name: '测试住户',
    phone: '13800138001',
    building: 'A栋',
    room_number: '101'
  };

  // Cleanup test data
  afterAll(async () => {
    try {
      await pool.execute('DELETE FROM residents WHERE student_id LIKE ?', ['TEST%']);
    } catch (error) {
      // Ignore cleanup errors
    } finally {
      // Close pool connection
      await pool.end();
    }
  });

  describe('Authentication & Authorization', () => {
    test('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/super-admin/resident');
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 403 for student role', async () => {
      const response = await request(app)
        .get('/api/super-admin/resident')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    test('should return 403 for repairman role', async () => {
      const response = await request(app)
        .get('/api/super-admin/resident')
        .set('Authorization', `Bearer ${repairmanToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('POST /api/super-admin/resident - Create resident', () => {
    test('should create resident successfully', async () => {
      const response = await request(app)
        .post('/api/super-admin/resident')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(testResident);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('创建住户成功');
      expect(response.body.data).toMatchObject({
        student_id: testResident.student_id,
        name: testResident.name,
        phone: testResident.phone,
        building: testResident.building,
        room_number: testResident.room_number
      });
      expect(response.body.data).toHaveProperty('id');
    });

    test('should return 400 for duplicate student_id', async () => {
      const response = await request(app)
        .post('/api/super-admin/resident')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(testResident);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('该学号已存在');
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/super-admin/resident')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          student_id: 'TEST2024002',
          name: '测试用户2'
          // Missing phone, building, room_number
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('所有字段都是必填的');
    });
  });

  describe('GET /api/super-admin/resident - Get residents', () => {
    test('should get residents list with pagination', async () => {
      const response = await request(app)
        .get('/api/super-admin/resident')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('获取住户列表成功');
      expect(response.body.data).toHaveProperty('list');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
    });

    test('should search by studentId', async () => {
      const response = await request(app)
        .get(`/api/super-admin/resident?studentId=${testResident.student_id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.list.length).toBeGreaterThan(0);
      expect(response.body.data.list[0].student_id).toContain(testResident.student_id);
    });

    test('should respect pagination parameters', async () => {
      const response = await request(app)
        .get('/api/super-admin/resident?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });
  });

  describe('PUT /api/super-admin/resident/:id - Update resident', () => {
    let residentId;

    beforeAll(async () => {
      const [result] = await pool.execute(
        'SELECT id FROM residents WHERE student_id = ?',
        [testResident.student_id]
      );
      residentId = result[0]?.id;
    });

    test('should update resident successfully', async () => {
      const response = await request(app)
        .put(`/api/super-admin/resident/${residentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: '更新后的姓名',
          phone: '13900139000'
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('更新住户成功');
      expect(response.body.data.name).toBe('更新后的姓名');
      expect(response.body.data.phone).toBe('13900139000');
    });

    test('should return 404 for non-existent resident', async () => {
      const response = await request(app)
        .put('/api/super-admin/resident/99999')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: '测试' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('住户不存在');
    });

    test('should return 400 for duplicate student_id', async () => {
      // Create another resident first
      await request(app)
        .post('/api/super-admin/resident')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          student_id: 'TEST2024999',
          name: '另一个住户',
          phone: '13700137000',
          building: 'B栋',
          room_number: '202'
        });

      // Try to update first resident with duplicate student_id
      const response = await request(app)
        .put(`/api/super-admin/resident/${residentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ student_id: 'TEST2024999' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('该学号已被其他住户使用');
    });

    test('should return 400 for no update fields', async () => {
      const response = await request(app)
        .put(`/api/super-admin/resident/${residentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('没有要更新的字段');
    });
  });

  describe('DELETE /api/super-admin/resident/:id - Delete resident', () => {
    let deleteResidentId;
    let uniqueSuffix = Date.now();

    beforeEach(async () => {
      // Create a resident for deletion test with unique ID
      const studentId = `TESTDEL${uniqueSuffix}`;
      uniqueSuffix++; // Increment for next test
      const [result] = await pool.execute(
        `INSERT INTO residents (student_id, name, phone, building, room_number)
         VALUES (?, ?, ?, ?, ?)`,
        [studentId, '待删除住户', '13800138000', 'C栋', '303']
      );
      deleteResidentId = result.insertId;
    });

    afterEach(async () => {
      // Clean up test data
      try {
        await pool.execute('DELETE FROM residents WHERE id = ?', [deleteResidentId]);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    test('should delete resident successfully', async () => {
      const response = await request(app)
        .delete(`/api/super-admin/resident/${deleteResidentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('删除住户成功');

      // Verify deletion
      const [result] = await pool.execute(
        'SELECT * FROM residents WHERE id = ?',
        [deleteResidentId]
      );
      expect(result.length).toBe(0);
    });

    test('should return 404 for non-existent resident', async () => {
      const response = await request(app)
        .delete('/api/super-admin/resident/99999')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('住户不存在');
    });

    test('should return 400 for registered resident', async () => {
      // Create a user with same username as resident's student_id
      await pool.execute(
        `INSERT INTO users (username, password, email, realName, phone, role)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE username = username`,
        ['TEST2024REG', 'hashedpassword', 'reg@test.com', '已注册用户', '13800138000', 'student']
      );

      // Create resident with same student_id
      const [result] = await pool.execute(
        `INSERT INTO residents (student_id, name, phone, building, room_number)
         VALUES (?, ?, ?, ?, ?)`,
        ['TEST2024REG', '已注册住户', '13800138000', 'D栋', '404']
      );
      const registeredResidentId = result.insertId;

      const response = await request(app)
        .delete(`/api/super-admin/resident/${registeredResidentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('该住户已注册账号，无法删除');

      // Cleanup
      await pool.execute('DELETE FROM users WHERE username = ?', ['TEST2024REG']);
      await pool.execute('DELETE FROM residents WHERE id = ?', [registeredResidentId]);
    });
  });
});
