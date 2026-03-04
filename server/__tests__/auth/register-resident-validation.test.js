const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/database');
const bcrypt = require('bcryptjs');

describe('POST /api/auth/register - Resident Validation', () => {
  // Test data matching residents table
  const validResident = {
    student_id: '2024999',  // 测试用学号
    name: '测试住户',
    phone: '13900139000',
    building: '测试楼',
    room_number: '999'
  };

  const registerData = {
    username: validResident.student_id,  // 学号作为 username
    password: 'password123',
    confirmPassword: 'password123',
    realName: validResident.name,
    phone: validResident.phone,
    building: validResident.building,
    roomNumber: validResident.room_number
  };

  // Setup: Insert test resident into residents table
  beforeAll(async () => {
    try {
      await pool.execute(
        'INSERT INTO residents (student_id, name, phone, building, room_number) VALUES (?, ?, ?, ?, ?)',
        [validResident.student_id, validResident.name, validResident.phone, validResident.building, validResident.room_number]
      );
    } catch (error) {
      // Resident might already exist from previous test run
      if (error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
    }
  });

  // Cleanup: Remove test data after all tests
  afterAll(async () => {
    try {
      await pool.execute('DELETE FROM users WHERE username = ?', [validResident.student_id]);
      await pool.execute('DELETE FROM residents WHERE student_id = ?', [validResident.student_id]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Success cases', () => {
    test('should register successfully when all 5 fields match residents table', async () => {
      // Clean up any existing user first
      await pool.execute('DELETE FROM users WHERE username = ?', [validResident.student_id]);

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 200);
      expect(response.body.message).toBe('注册成功');
      expect(response.body.data).toHaveProperty('username', validResident.student_id);
      expect(response.body.data).toHaveProperty('role', 'student');

      // Verify user was created with correct data
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE username = ?',
        [validResident.student_id]
      );

      expect(users).toHaveLength(1);
      expect(users[0].role).toBe('student');
      expect(users[0].realName).toBe(validResident.name);
      expect(users[0].phone).toBe(validResident.phone);
      expect(users[0].building).toBe(validResident.building);
      expect(users[0].roomNumber).toBe(validResident.room_number);

      // Verify password is hashed
      const isPasswordValid = await bcrypt.compare('password123', users[0].password);
      expect(isPasswordValid).toBe(true);
    });

    test('should allow email field as optional during registration', async () => {
      // Clean up and create fresh test
      await pool.execute('DELETE FROM users WHERE username = ?', [validResident.student_id]);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...registerData,
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('username', validResident.student_id);

      // Verify email was saved
      const [users] = await pool.execute(
        'SELECT email FROM users WHERE username = ?',
        [validResident.student_id]
      );

      expect(users[0].email).toBe('test@example.com');
    });
  });

  describe('Failure cases - resident validation mismatch', () => {
    beforeEach(async () => {
      // Clean up user before each test
      await pool.execute('DELETE FROM users WHERE username = ?', [validResident.student_id]);
    });

    test('should return mismatchedFields when realName does not match', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...registerData,
          realName: '错误姓名'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 400);
      expect(response.body.message).toContain('验证信息不匹配');
      expect(response.body.data).toHaveProperty('mismatchedFields');
      expect(response.body.data.mismatchedFields).toContain('realName');
    });

    test('should return mismatchedFields when phone does not match', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...registerData,
          phone: '00000000000'
        });

      expect(response.status).toBe(400);
      expect(response.body.data).toHaveProperty('mismatchedFields');
      expect(response.body.data.mismatchedFields).toContain('phone');
    });

    test('should return mismatchedFields when building does not match', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...registerData,
          building: '错误楼栋'
        });

      expect(response.status).toBe(400);
      expect(response.body.data).toHaveProperty('mismatchedFields');
      expect(response.body.data.mismatchedFields).toContain('building');
    });

    test('should return mismatchedFields when roomNumber does not match', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...registerData,
          roomNumber: '000'
        });

      expect(response.status).toBe(400);
      expect(response.body.data).toHaveProperty('mismatchedFields');
      expect(response.body.data.mismatchedFields).toContain('roomNumber');
    });

    test('should return multiple mismatchedFields when several fields are wrong', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...registerData,
          realName: '错误姓名',
          phone: '00000000000',
          building: '错误楼栋'
        });

      expect(response.status).toBe(400);
      expect(response.body.data.mismatchedFields).toContain('realName');
      expect(response.body.data.mismatchedFields).toContain('phone');
      expect(response.body.data.mismatchedFields).toContain('building');
      expect(response.body.data.mismatchedFields).not.toContain('roomNumber');
    });

    test('should return error when student_id does not exist in residents table', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...registerData,
          username: '9999999'  // Non-existent student ID
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('验证信息不匹配');
      expect(response.body.data).toHaveProperty('mismatchedFields');
    });
  });

  describe('Failure cases - duplicate registration', () => {
    test('should return 409 when username (student_id) is already registered', async () => {
      // First, create a user successfully
      await pool.execute('DELETE FROM users WHERE username = ?', [validResident.student_id]);
      
      const firstResponse = await request(app)
        .post('/api/auth/register')
        .send(registerData);

      expect(firstResponse.status).toBe(200);

      // Try to register again with same username
      const secondResponse = await request(app)
        .post('/api/auth/register')
        .send(registerData);

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body).toHaveProperty('code', 409);
      expect(secondResponse.body.message).toContain('已注册');
    });
  });

  describe('Validation errors', () => {
    test('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: validResident.student_id
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 when passwords do not match', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...registerData,
          confirmPassword: 'differentpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('两次输入的密码不一致');
    });

    test('should return 400 when password is too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...registerData,
          password: '12345',
          confirmPassword: '12345'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('密码长度不能少于6位');
    });
  });

  describe('Role enforcement', () => {
    beforeEach(async () => {
      await pool.execute('DELETE FROM users WHERE username = ?', [validResident.student_id]);
    });

    test('should always set role to student regardless of input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...registerData,
          role: 'admin'  // Try to register as admin
        });

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('student');  // Should be forced to student

      // Verify in database
      const [users] = await pool.execute(
        'SELECT role FROM users WHERE username = ?',
        [validResident.student_id]
      );

      expect(users[0].role).toBe('student');
    });

    test('should ignore role field and default to student', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...registerData,
          role: 'super_admin'  // Try to register as super_admin
        });

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('student');
    });
  });
});
