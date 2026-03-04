const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/database');
const bcrypt = require('bcryptjs');

describe('POST /api/auth/reset-password', () => {
  const testUser = {
    username: 'testuser_reset',
    password: 'oldpassword',
    email: 'test@example.com',
    realName: '测试用户',
    phone: '13800138000',
    role: 'student'
  };

  // Setup: Create test user before all tests
  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    
    try {
      await pool.execute(
        'INSERT INTO users (username, password, email, realName, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
        [testUser.username, hashedPassword, testUser.email, testUser.realName, testUser.phone, testUser.role]
      );
    } catch (error) {
      // User might already exist from previous test run
      if (error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
    }
  });

  // Cleanup: Remove test user after all tests
  afterAll(async () => {
    try {
      await pool.execute('DELETE FROM users WHERE username = ?', [testUser.username]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Success cases', () => {
    test('should reset password with all 4 fields matching', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          username: testUser.username,
          email: testUser.email,
          realName: testUser.realName,
          phone: testUser.phone,
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 200);
      expect(response.body.message).toBe('密码重置成功');

      // Verify new password works for login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: 'newpassword123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data).toHaveProperty('token');

      // Reset password back for other tests
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      await pool.execute(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, testUser.username]
      );
    });
  });

  describe('Failure cases - verification mismatch', () => {
    test('should return 401 when email does not match', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          username: testUser.username,
          email: 'wrong@example.com',
          realName: testUser.realName,
          phone: testUser.phone,
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('code', 401);
      expect(response.body.message).toBe('验证信息不匹配，无法重置密码');
    });

    test('should return 401 when realName does not match', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          username: testUser.username,
          email: testUser.email,
          realName: '错误姓名',
          phone: testUser.phone,
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('code', 401);
    });

    test('should return 401 when phone does not match', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          username: testUser.username,
          email: testUser.email,
          realName: testUser.realName,
          phone: '99999999999',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('code', 401);
    });

    test('should return 401 when username does not match', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          username: 'nonexistent_user',
          email: testUser.email,
          realName: testUser.realName,
          phone: testUser.phone,
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('code', 401);
    });
  });

  describe('Failure cases - non-existent user', () => {
    test('should return 401 when user does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          username: 'nonexistent',
          email: 'noone@example.com',
          realName: '不存在用户',
          phone: '00000000000',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('验证信息不匹配，无法重置密码');
    });
  });

  describe('Validation errors', () => {
    test('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          username: testUser.username
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('所有字段不能为空');
    });

    test('should return 400 when passwords do not match', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          username: testUser.username,
          email: testUser.email,
          realName: testUser.realName,
          phone: testUser.phone,
          newPassword: 'newpassword123',
          confirmPassword: 'differentpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('两次输入的密码不一致');
    });

    test('should return 400 when password is too short', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          username: testUser.username,
          email: testUser.email,
          realName: testUser.realName,
          phone: testUser.phone,
          newPassword: '12345',
          confirmPassword: '12345'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('密码长度不能少于6位');
    });
  });
});
