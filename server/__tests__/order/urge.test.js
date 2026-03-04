/**
 * 订单催单接口测试
 * 
 * 测试场景：
 * - 成功催单
 * - 订单不存在
 * - 非自己的订单
 * - 非pending状态
 * - 时间不足6小时
 * - 重复催单
 */

const request = require('supertest');
const app = require('../../app');
const mysql = require('mysql2/promise');
require('dotenv').config();

describe('POST /api/orders/:id/urge', () => {
  let connection;
  let studentToken;
  let otherStudentToken;
  let testOrderId;
  let student1Id;
  let student2Id;

  beforeAll(async () => {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dormitory_repair'
    });

    // 先创建测试居民数据
    try {
      await connection.execute(
        'INSERT INTO residents (student_id, name, phone, building, room_number) VALUES (?, ?, ?, ?, ?)',
        ['test_urge_s1', '测试学生1', '13800138001', 'A栋', '101']
      );
      await connection.execute(
        'INSERT INTO residents (student_id, name, phone, building, room_number) VALUES (?, ?, ?, ?, ?)',
        ['test_urge_s2', '测试学生2', '13800138002', 'A栋', '102']
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
    }

    // 清理之前的测试用户
    await connection.execute('DELETE FROM users WHERE username IN (?, ?)', ['test_urge_s1', 'test_urge_s2']);

    // 注册测试学生1
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'test_urge_s1',
        password: 'password123',
        confirmPassword: 'password123',
        realName: '测试学生1',
        phone: '13800138001',
        building: 'A栋',
        roomNumber: '101'
      });

    // 注册测试学生2
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'test_urge_s2',
        password: 'password123',
        confirmPassword: 'password123',
        realName: '测试学生2',
        phone: '13800138002',
        building: 'A栋',
        roomNumber: '102'
      });

    // 登录获取token
    const loginRes1 = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test_urge_s1',
        password: 'password123'
      });
    studentToken = loginRes1.body.data.token;

    const loginRes2 = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test_urge_s2',
        password: 'password123'
      });
    otherStudentToken = loginRes2.body.data.token;

    // 获取用户ID
    const [users] = await connection.execute(
      'SELECT userId, username FROM users WHERE username IN (?, ?)',
      ['test_urge_s1', 'test_urge_s2']
    );
    student1Id = users.find(u => u.username === 'test_urge_s1').userId;
    student2Id = users.find(u => u.username === 'test_urge_s2').userId;
  });

  afterAll(async () => {
    // 清理测试数据
    if (connection) {
      await connection.execute(`DELETE FROM repairOrders WHERE userId IN (?, ?)`, [student1Id, student2Id]);
      await connection.execute(`DELETE FROM users WHERE username IN (?, ?)`, ['test_urge_s1', 'test_urge_s2']);
      await connection.execute(`DELETE FROM residents WHERE student_id IN (?, ?)`, ['test_urge_s1', 'test_urge_s2']);
      await connection.end();
    }
  });

  describe('成功催单', () => {
    beforeEach(async () => {
      // 创建7小时前的pending订单
      const [result] = await connection.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, createdAt)
         VALUES (?, '水管维修', 'A栋', '101', '13800138001', '测试催单', 'pending', DATE_SUB(NOW(), INTERVAL 7 HOUR))`,
        [student1Id]
      );
      testOrderId = result.insertId;
    });

    afterEach(async () => {
      if (testOrderId) {
        await connection.execute('DELETE FROM repairOrders WHERE orderId = ?', [testOrderId]);
      }
    });

    test('应该成功催单并更新字段', async () => {
      const res = await request(app)
        .post(`/api/orders/${testOrderId}/urge`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('催单成功');
      expect(res.body.data).toMatchObject({
        orderId: testOrderId,
        is_urge: 1
      });
      expect(res.body.data.urge_time).toBeDefined();

      // 验证数据库更新
      const [orders] = await connection.execute(
        'SELECT is_urge, urge_time FROM repairOrders WHERE orderId = ?',
        [testOrderId]
      );
      expect(orders[0].is_urge).toBe(1);
      expect(orders[0].urge_time).not.toBeNull();
    });
  });

  describe('失败场景', () => {
    test('订单不存在应返回404', async () => {
      const res = await request(app)
        .post('/api/orders/99999/urge')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(res.status);
      expect(res.body.message).toMatch(/不存在或无权访问/);
    });

    test('催别人的订单应返回404', async () => {
      // 创建其他学生的订单
      const [result] = await connection.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, createdAt)
         VALUES (?, '水管维修', 'A栋', '102', '13800138002', '测试催单', 'pending', DATE_SUB(NOW(), INTERVAL 7 HOUR))`,
        [student2Id]
      );
      const otherOrderId = result.insertId;

      const res = await request(app)
        .post(`/api/orders/${otherOrderId}/urge`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(res.status);
      expect(res.body.message).toMatch(/不存在或无权访问/);

      // 清理
      await connection.execute('DELETE FROM repairOrders WHERE orderId = ?', [otherOrderId]);
    });

    test('非pending状态应返回400', async () => {
      // 创建processing状态订单
      const [result] = await connection.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, createdAt)
         VALUES (?, '水管维修', 'A栋', '101', '13800138001', '测试催单', 'processing', DATE_SUB(NOW(), INTERVAL 7 HOUR))`,
        [student1Id]
      );
      const processingOrderId = result.insertId;

      const res = await request(app)
        .post(`/api/orders/${processingOrderId}/urge`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(res.status);
      expect(res.body.message).toMatch(/只能催单待处理状态的订单/);

      // 清理
      await connection.execute('DELETE FROM repairOrders WHERE orderId = ?', [processingOrderId]);
    });

    test('时间不足6小时应返回400', async () => {
      // 创建1小时前的订单
      const [result] = await connection.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, createdAt)
         VALUES (?, '水管维修', 'A栋', '101', '13800138001', '测试催单', 'pending', DATE_SUB(NOW(), INTERVAL 1 HOUR))`,
        [student1Id]
      );
      const recentOrderId = result.insertId;

      const res = await request(app)
        .post(`/api/orders/${recentOrderId}/urge`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(res.status);
      expect(res.body.message).toMatch(/订单创建不足6小时，暂时无法催单/);

      // 清理
      await connection.execute('DELETE FROM repairOrders WHERE orderId = ?', [recentOrderId]);
    });

    test('重复催单应返回400', async () => {
      // 创建已催单的订单
      const [result] = await connection.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, createdAt, is_urge, urge_time)
         VALUES (?, '水管维修', 'A栋', '101', '13800138001', '测试催单', 'pending', DATE_SUB(NOW(), INTERVAL 7 HOUR), TRUE, NOW())`,
        [student1Id]
      );
      const urgedOrderId = result.insertId;

      const res = await request(app)
        .post(`/api/orders/${urgedOrderId}/urge`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(res.status);
      expect(res.body.message).toMatch(/该订单已催单，请勿重复操作/);

      // 清理
      await connection.execute('DELETE FROM repairOrders WHERE orderId = ?', [urgedOrderId]);
    });

    test('未登录应返回401', async () => {
      const res = await request(app)
        .post('/api/orders/1/urge');

      expect(res.status).toBe(401);
    });
  });
});
