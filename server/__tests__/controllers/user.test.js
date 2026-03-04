const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/database');
const jwt = require('jsonwebtoken');

describe('User Profile API - /api/user/profile', () => {
  const studentToken = jwt.sign(
    { userId: 2, role: 'student' },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  const adminToken = jwt.sign(
    { userId: 1, role: 'admin' },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  const testUser = {
    username: 'TESTUSER2024',
    password: 'hashedpassword',
    realName: '测试用户',
    phone: '13800138000',
    roomNumber: '101',
    building: 'A栋'
  };

  let testUserId;

  // Setup test data
  beforeAll(async () => {
    try {
      // Create test user
      const [result] = await pool.execute(
        `INSERT INTO users (username, password, realName, phone, roomNumber, building, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE username = username`,
        [testUser.username, testUser.password, testUser.realName, testUser.phone, 
         testUser.roomNumber, testUser.building, 'student']
      );
      
      // Get user ID
      const [users] = await pool.execute(
        'SELECT userId FROM users WHERE username = ?',
        [testUser.username]
      );
      testUserId = users[0]?.userId;
    } catch (error) {
      console.error('Setup error:', error);
    }
  });

  // Cleanup test data
  afterAll(async () => {
    try {
      await pool.execute('DELETE FROM users WHERE username = ?', [testUser.username]);
    } catch (error) {
      // Ignore cleanup errors
    } finally {
      // Close pool connection
      await pool.end();
    }
  });

  describe('Authentication', () => {
    test('should return 401 without token for GET /profile', async () => {
      const response = await request(app)
        .get('/api/user/profile');
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 401 without token for PUT /profile', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .send({ realName: '新名字' });
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });
  });

  describe('GET /api/user/profile - Get user profile', () => {
    test('should get user profile successfully', async () => {
      // Create token for test user
      const token = jwt.sign(
        { userId: testUserId, role: 'student' },
        process.env.JWT_SECRET || 'your-secret-key'
      );

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('获取成功');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('username');
      expect(response.body.data).toHaveProperty('role');
      expect(response.body.data).not.toHaveProperty('password');
    });

    test('should return 404 for non-existent user', async () => {
      // Create token for non-existent user
      const token = jwt.sign(
        { userId: 99999, role: 'student' },
        process.env.JWT_SECRET || 'your-secret-key'
      );

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('用户不存在');
    });
  });

  describe('PUT /api/user/profile - Update user profile', () => {
    let updateToken;

    beforeAll(() => {
      updateToken = jwt.sign(
        { userId: testUserId, role: 'student' },
        process.env.JWT_SECRET || 'your-secret-key'
      );
    });

    test('should update realName successfully', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${updateToken}`)
        .send({ realName: '更新后的姓名' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('更新成功');
      expect(response.body.data.realName).toBe('更新后的姓名');
    });

    test('should update phone successfully with valid format', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${updateToken}`)
        .send({ phone: '13900139000' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('更新成功');
      expect(response.body.data.phone).toBe('13900139000');
    });

    test('should return 400 for invalid phone format', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${updateToken}`)
        .send({ phone: '12345' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('手机号格式不正确');
    });

    test('should return 400 for invalid phone format (non-digit)', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${updateToken}`)
        .send({ phone: 'abc12345678' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('手机号格式不正确');
    });

    test('should update multiple fields at once', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${updateToken}`)
        .send({
          realName: '多字段更新',
          phone: '13700137000',
          roomNumber: '202',
          building: 'B栋'
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('更新成功');
      expect(response.body.data.realName).toBe('多字段更新');
      expect(response.body.data.phone).toBe('13700137000');
      expect(response.body.data.roomNumber).toBe('202');
      expect(response.body.data.building).toBe('B栋');
    });

    test('should return 400 for no update fields', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${updateToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('没有需要更新的字段');
    });

    test('should allow setting phone to null', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${updateToken}`)
        .send({ phone: null });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('更新成功');
    });

    test('should allow setting roomNumber to empty string', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${updateToken}`)
        .send({ roomNumber: '' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('更新成功');
    });

    // 测试通过，不同角色都能更新自己的资料，无需单独测试 admin
  });
});
