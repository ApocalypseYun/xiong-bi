const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/database');
const bcrypt = require('bcryptjs');

describe('Repairman Evaluation API - POST /api/orders/:id/repairman-evaluate', () => {
  let studentToken;
  let repairmanToken;
  let adminToken;
  let testOrderId;
  let testStudentId;
  let testRepairmanId;
  let testAdminId;

  const student = {
    username: 'student_eval_test',
    password: 'student123',
    role: 'student',
    realName: '测试学生'
  };

  const repairman = {
    username: 'repairman_eval_test',
    password: 'repair123',
    role: 'repairman',
    realName: '测试维修工',
    phone: '13800138001'
  };

  const admin = {
    username: 'admin_eval_test',
    password: 'admin123',
    role: 'super_admin',
    realName: '测试管理员'
  };

  beforeAll(async () => {
    // 先清理可能存在的测试数据
    await pool.execute('DELETE FROM evaluations WHERE orderId IN (SELECT orderId FROM repairOrders WHERE userId IN (SELECT userId FROM users WHERE username IN (?, ?, ?)))', [student.username, repairman.username, admin.username]);
    await pool.execute('DELETE FROM repairOrders WHERE userId IN (SELECT userId FROM users WHERE username IN (?, ?, ?))', [student.username, repairman.username, admin.username]);
    await pool.execute('DELETE FROM users WHERE username IN (?, ?, ?)', [student.username, repairman.username, admin.username]);

    // 创建测试用户
    const hashedStudentPassword = await bcrypt.hash(student.password, 10);
    const [studentResult] = await pool.execute(
      'INSERT INTO users (username, password, role, realName) VALUES (?, ?, ?, ?)',
      [student.username, hashedStudentPassword, student.role, student.realName]
    );
    testStudentId = studentResult.insertId;
    studentToken = generateToken(testStudentId, student.role);

    const hashedRepairmanPassword = await bcrypt.hash(repairman.password, 10);
    const [repairmanResult] = await pool.execute(
      'INSERT INTO users (username, password, role, realName, phone) VALUES (?, ?, ?, ?, ?)',
      [repairman.username, hashedRepairmanPassword, repairman.role, repairman.realName, repairman.phone]
    );
    testRepairmanId = repairmanResult.insertId;
    repairmanToken = generateToken(testRepairmanId, repairman.role);

    const hashedAdminPassword = await bcrypt.hash(admin.password, 10);
    const [adminResult] = await pool.execute(
      'INSERT INTO users (username, password, role, realName) VALUES (?, ?, ?, ?)',
      [admin.username, hashedAdminPassword, admin.role, admin.realName]
    );
    testAdminId = adminResult.insertId;
    adminToken = generateToken(testAdminId, admin.role);
  });

  afterAll(async () => {
    // 清理测试数据
    await pool.execute('DELETE FROM evaluations WHERE orderId IN (SELECT orderId FROM repairOrders WHERE userId = ?)', [testStudentId]);
    await pool.execute('DELETE FROM repairOrders WHERE userId = ?', [testStudentId]);
    await pool.execute('DELETE FROM users WHERE userId IN (?, ?, ?)', [testStudentId, testRepairmanId, testAdminId]);
    await pool.end();
  });

  describe('成功场景', () => {
    beforeEach(async () => {
      // 创建已完成的订单
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, adminId, completedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, NOW())`,
        [testStudentId, '水管', '1栋', '101', '13800138000', '水管漏水', testRepairmanId]
      );
      testOrderId = orderResult.insertId;

      // 住户已评价
      await pool.execute(
        `INSERT INTO evaluations (orderId, userId, rating, comment, createdAt)
         VALUES (?, ?, ?, ?, NOW())`,
        [testOrderId, testStudentId, 5, '服务很好']
      );
    });

    afterEach(async () => {
      await pool.execute('DELETE FROM evaluations WHERE orderId = ?', [testOrderId]);
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [testOrderId]);
    });

    test('维修工成功评价住户', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrderId}/repairman-evaluate`)
        .set('Authorization', `Bearer ${repairmanToken}`)
        .send({
          rating: 4,
          comment: '住户很配合'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 200);
      expect(response.body.message).toBe('评价成功');
      expect(response.body.data.orderId).toBe(testOrderId);
      expect(response.body.data.rating).toBe(4);
      expect(response.body.data.comment).toBe('住户很配合');

      // 验证数据库中的评价
      const [evaluations] = await pool.execute(
        'SELECT repairman_rating, repairman_comment FROM evaluations WHERE orderId = ?',
        [testOrderId]
      );
      expect(evaluations[0].repairman_rating).toBe(4);
      expect(evaluations[0].repairman_comment).toBe('住户很配合');
    });

    test('管理员也可以评价（兼容性）', async () => {
      // 创建管理员接单的订单
      const [adminOrderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, adminId, completedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, NOW())`,
        [testStudentId, '电路', '2栋', '202', '13800138001', '电路故障', testAdminId]
      );
      const adminOrderId = adminOrderResult.insertId;

      await pool.execute(
        `INSERT INTO evaluations (orderId, userId, rating, comment, createdAt)
         VALUES (?, ?, ?, ?, NOW())`,
        [adminOrderId, testStudentId, 4, '维修及时']
      );

      const response = await request(app)
        .post(`/api/orders/${adminOrderId}/repairman-evaluate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rating: 5,
          comment: '非常满意'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 200);

      // 清理
      await pool.execute('DELETE FROM evaluations WHERE orderId = ?', [adminOrderId]);
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [adminOrderId]);
    });
  });

  describe('失败场景', () => {
    test('订单不存在', async () => {
      const response = await request(app)
        .post('/api/orders/99999/repairman-evaluate')
        .set('Authorization', `Bearer ${repairmanToken}`)
        .send({
          rating: 4,
          comment: '测试评论'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('code', response.status);
      expect(response.body.message).toBe('订单不存在');
    });

    test('订单未完成', async () => {
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
         VALUES (?, ?, ?, ?, ?, ?, 'processing')`,
        [testStudentId, '窗户', '3栋', '303', '13800138002', '窗户损坏']
      );
      const orderId = orderResult.insertId;

      const response = await request(app)
        .post(`/api/orders/${orderId}/repairman-evaluate`)
        .set('Authorization', `Bearer ${repairmanToken}`)
        .send({
          rating: 4,
          comment: '测试评论'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', response.status);
      expect(response.body.message).toBe('只能评价已完成的订单');

      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [orderId]);
    });

    test('维修工无权限（不是该订单的维修工）', async () => {
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, adminId, completedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, NOW())`,
        [testStudentId, '门锁', '4栋', '404', '13800138003', '门锁坏了', testAdminId] // 被其他维修工接单
      );
      const orderId = orderResult.insertId;

      await pool.execute(
        `INSERT INTO evaluations (orderId, userId, rating, comment, createdAt)
         VALUES (?, ?, ?, ?, NOW())`,
        [orderId, testStudentId, 5, '服务好']
      );

      const response = await request(app)
        .post(`/api/orders/${orderId}/repairman-evaluate`)
        .set('Authorization', `Bearer ${repairmanToken}`) // 当前维修工不是接单的维修工
        .send({
          rating: 4,
          comment: '测试评论'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('code', response.status);
      expect(response.body.message).toBe('无权评价该订单');

      await pool.execute('DELETE FROM evaluations WHERE orderId = ?', [orderId]);
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [orderId]);
    });

    test('住户未评价', async () => {
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, adminId, completedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, NOW())`,
        [testStudentId, '灯泡', '5栋', '505', '13800138004', '灯泡坏了', testRepairmanId]
      );
      const orderId = orderResult.insertId;

      const response = await request(app)
        .post(`/api/orders/${orderId}/repairman-evaluate`)
        .set('Authorization', `Bearer ${repairmanToken}`)
        .send({
          rating: 4,
          comment: '测试评论'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', response.status);
      expect(response.body.message).toBe('住户尚未评价，请等待住户评价后再评价');

      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [orderId]);
    });

    test('超过7天窗口', async () => {
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, adminId, completedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, DATE_SUB(NOW(), INTERVAL 8 DAY))`,
        [testStudentId, '空调', '6栋', '606', '13800138005', '空调故障', testRepairmanId]
      );
      const orderId = orderResult.insertId;

      // 住户8天前评价
      await pool.execute(
        `INSERT INTO evaluations (orderId, userId, rating, comment, createdAt)
         VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 8 DAY))`,
        [orderId, testStudentId, 5, '服务很好']
      );

      const response = await request(app)
        .post(`/api/orders/${orderId}/repairman-evaluate`)
        .set('Authorization', `Bearer ${repairmanToken}`)
        .send({
          rating: 4,
          comment: '测试评论'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', response.status);
      expect(response.body.message).toBe('评价时间已超过7天，无法评价');

      await pool.execute('DELETE FROM evaluations WHERE orderId = ?', [orderId]);
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [orderId]);
    });

    test('重复评价', async () => {
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, adminId, completedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, NOW())`,
        [testStudentId, '热水器', '7栋', '707', '13800138006', '热水器故障', testRepairmanId]
      );
      const orderId = orderResult.insertId;

      await pool.execute(
        `INSERT INTO evaluations (orderId, userId, rating, comment, repairman_rating, repairman_comment, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [orderId, testStudentId, 5, '服务很好', 4, '已评价过']
      );

      const response = await request(app)
        .post(`/api/orders/${orderId}/repairman-evaluate`)
        .set('Authorization', `Bearer ${repairmanToken}`)
        .send({
          rating: 5,
          comment: '再次评价'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', response.status);
      expect(response.body.message).toBe('该订单已评价，不能重复评价');

      await pool.execute('DELETE FROM evaluations WHERE orderId = ?', [orderId]);
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [orderId]);
    });

    test('缺少必填字段', async () => {
      const response = await request(app)
        .post('/api/orders/1/repairman-evaluate')
        .set('Authorization', `Bearer ${repairmanToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', response.status);
      expect(response.body.message).toBe('评分不能为空');
    });

    test('评分范围错误（小于1）', async () => {
      const response = await request(app)
        .post('/api/orders/1/repairman-evaluate')
        .set('Authorization', `Bearer ${repairmanToken}`)
        .send({
          rating: 0,
          comment: '测试评论'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', response.status);
      expect(response.body.message).toBe('评分必须在1-5之间');
    });

    test('评分范围错误（大于5）', async () => {
      const response = await request(app)
        .post('/api/orders/1/repairman-evaluate')
        .set('Authorization', `Bearer ${repairmanToken}`)
        .send({
          rating: 6,
          comment: '测试评论'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', response.status);
      expect(response.body.message).toBe('评分必须在1-5之间');
    });

    test('学生无权限评价', async () => {
      const response = await request(app)
        .post('/api/orders/1/repairman-evaluate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          rating: 4,
          comment: '测试评论'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('code', response.status);
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });
});

function generateToken(userId, role) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId, role }, process.env.JWT_SECRET || 'test_jwt_secret_key', { expiresIn: '1h' });
}
