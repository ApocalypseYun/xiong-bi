const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/database');
const bcrypt = require('bcryptjs');

describe('POST /api/orders/:id/withdraw', () => {
  let studentToken;
  let otherStudentToken;
  let testOrderId;
  let processingOrderId;
  let testUserId;
  let otherUserId;

  const testStudent = {
    username: 'test_withdraw_student',
    password: 'password123',
    realName: '撤单测试学生',
    phone: '13900139001',
    building: 'A栋',
    roomNumber: '101'
  };

  const otherStudent = {
    username: 'test_withdraw_other',
    password: 'password123',
    realName: '其他学生',
    phone: '13900139002',
    building: 'B栋',
    roomNumber: '202'
  };

  beforeAll(async () => {
    // 创建测试学生
    const hashedPassword = await bcrypt.hash(testStudent.password, 10);
    const [studentResult] = await pool.execute(
      'INSERT INTO users (username, password, role, realName, phone, building, roomNumber) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testStudent.username, hashedPassword, 'student', testStudent.realName, testStudent.phone, testStudent.building, testStudent.roomNumber]
    );
    testUserId = studentResult.insertId;

    // 创建其他学生
    const otherHashedPassword = await bcrypt.hash(otherStudent.password, 10);
    const [otherResult] = await pool.execute(
      'INSERT INTO users (username, password, role, realName, phone, building, roomNumber) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [otherStudent.username, otherHashedPassword, 'student', otherStudent.realName, otherStudent.phone, otherStudent.building, otherStudent.roomNumber]
    );
    otherUserId = otherResult.insertId;

    // 登录获取 token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: testStudent.username, password: testStudent.password });
    studentToken = loginRes.body.data.token;

    const otherLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: otherStudent.username, password: otherStudent.password });
    otherStudentToken = otherLoginRes.body.data.token;

    // 创建测试订单（pending 状态）
    const [orderResult] = await pool.execute(
      `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [testUserId, '水电', testStudent.building, testStudent.roomNumber, testStudent.phone, '测试撤单功能']
    );
    testOrderId = orderResult.insertId;

    // 创建 processing 状态的订单
    const [processingResult] = await pool.execute(
      `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'processing')`,
      [testUserId, '门窗', testStudent.building, testStudent.roomNumber, testStudent.phone, '测试processing状态撤单']
    );
    processingOrderId = processingResult.insertId;
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      await pool.execute('DELETE FROM repairOrders WHERE userId IN (?, ?)', [testUserId, otherUserId]);
      await pool.execute('DELETE FROM users WHERE userId IN (?, ?)', [testUserId, otherUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('成功撤单', () => {
    it('应该成功撤回 pending 状态的订单', async () => {
      const res = await request(app)
        .post(`/api/orders/${testOrderId}/withdraw`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toContain('撤单成功');

      // 验证订单状态已更新
      const [orders] = await pool.execute(
        'SELECT status FROM repairOrders WHERE orderId = ?',
        [testOrderId]
      );
      expect(orders[0].status).toBe('withdrawn');
    });
  });

  describe('失败场景', () => {
    it('应该拒绝撤回 processing 状态的订单', async () => {
      const res = await request(app)
        .post(`/api/orders/${processingOrderId}/withdraw`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('只能撤回待处理的订单');
    });

    it('应该拒绝非创建者撤回订单', async () => {
      // 创建一个新订单用于此测试
      const [newOrderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [testUserId, '其他', testStudent.building, testStudent.roomNumber, testStudent.phone, '非创建者测试']
      );
      const newOrderId = newOrderResult.insertId;

      const res = await request(app)
        .post(`/api/orders/${newOrderId}/withdraw`)
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe(403);
      expect(res.body.message).toContain('无权撤回此订单');

      // 清理
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [newOrderId]);
    });

    it('应该拒绝撤回不存在的订单', async () => {
      const res = await request(app)
        .post('/api/orders/999999/withdraw')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
      expect(res.body.message).toContain('订单不存在');
    });

    it('应该拒绝未认证用户撤回订单', async () => {
      const res = await request(app)
        .post(`/api/orders/${testOrderId}/withdraw`);

      expect(res.status).toBe(401);
    });

    it('应该拒绝撤回 completed 状态的订单', async () => {
      // 创建 completed 状态的订单
      const [completedResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, completedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', NOW())`,
        [testUserId, '网络', testStudent.building, testStudent.roomNumber, testStudent.phone, '测试completed状态撤单']
      );
      const completedOrderId = completedResult.insertId;

      const res = await request(app)
        .post(`/api/orders/${completedOrderId}/withdraw`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('只能撤回待处理的订单');

      // 清理
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [completedOrderId]);
    });

    it('应该拒绝撤回 withdrawn 状态的订单', async () => {
      // 创建 withdrawn 状态的订单
      const [withdrawnResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
         VALUES (?, ?, ?, ?, ?, ?, 'withdrawn')`,
        [testUserId, '其他', testStudent.building, testStudent.roomNumber, testStudent.phone, '测试withdrawn状态重复撤单']
      );
      const withdrawnOrderId = withdrawnResult.insertId;

      const res = await request(app)
        .post(`/api/orders/${withdrawnOrderId}/withdraw`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('只能撤回待处理的订单');

      // 清理
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [withdrawnOrderId]);
    });
  });
});
