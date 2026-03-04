const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/database');
const jwt = require('jsonwebtoken');

describe('Evaluation API - /api/evaluations', () => {
  const adminToken = jwt.sign(
    { userId: 1, role: 'admin' },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  const studentToken = jwt.sign(
    { userId: 2, role: 'student' },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  const otherStudentToken = jwt.sign(
    { userId: 3, role: 'student' },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  let testOrderId;
  let completedOrderId;
  let testEvaluationId;

  // Setup test data
  beforeAll(async () => {
    // Create completed order for student 2 (can be evaluated)
    const [completedOrder] = await pool.execute(
      `INSERT INTO repairOrders (userId, repairType, building, roomNumber, description, contactPhone, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'completed', NOW())`,
      [2, '水电维修', '1号楼', '101', '测试已完成订单-可评价', '13800138001']
    );
    completedOrderId = completedOrder.insertId;

    // Create pending order for student 2 (cannot be evaluated)
    const [pendingOrder] = await pool.execute(
      `INSERT INTO repairOrders (userId, repairType, building, roomNumber, description, contactPhone, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [2, '水电维修', '1号楼', '102', '测试待处理订单-不可评价', '13800138002']
    );
    testOrderId = pendingOrder.insertId;
  });

  // Cleanup test data
  afterAll(async () => {
    try {
      await pool.execute('DELETE FROM evaluations WHERE content LIKE ?', ['测试%']);
      await pool.execute('DELETE FROM repairOrders WHERE description LIKE ?', ['测试%']);
    } catch (error) {
      // Ignore cleanup errors
    } finally {
      // Close pool connection
      await pool.end();
    }
  });

  describe('Authentication & Authorization', () => {
    test('should return 401 without token for POST /', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .send({ orderId: 1, rating: 5 });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 401 without token for GET /', async () => {
      const response = await request(app)
        .get('/api/evaluations');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 401 without token for GET /admin', async () => {
      const response = await request(app)
        .get('/api/evaluations/admin');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 403 for student role for GET /admin', async () => {
      const response = await request(app)
        .get('/api/evaluations/admin')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('POST /api/evaluations - Create evaluation', () => {
    test('should create evaluation successfully', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          orderId: completedOrderId,
          rating: 5,
          content: '测试评价内容-成功'
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('评价成功');
      expect(response.body.data).toMatchObject({
        orderId: completedOrderId,
        rating: 5,
        content: '测试评价内容-成功'
      });
      expect(response.body.data).toHaveProperty('evaluationId');

      testEvaluationId = response.body.data.evaluationId;
    });

    test('should return 400 for missing orderId', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          rating: 5,
          content: '测试评价内容'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('订单ID和评分不能为空');
    });

    test('should return 400 for missing rating', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          orderId: completedOrderId,
          content: '测试评价内容'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('订单ID和评分不能为空');
    });

    test('should return 400 for rating less than 1', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          orderId: completedOrderId,
          rating: -1,
          content: '测试评价内容'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('评分必须在1-5之间');
    });

    test('should return 400 for rating greater than 5', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          orderId: completedOrderId,
          rating: 6,
          content: '测试评价内容'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('评分必须在1-5之间');
    });

    test('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          orderId: 99999,
          rating: 5,
          content: '测试评价内容'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('订单不存在');
    });

    test('should return 403 for order belonging to another user', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send({
          orderId: completedOrderId,
          rating: 5,
          content: '测试评价内容'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权评价该订单');
    });

    test('should return 400 for non-completed order', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          orderId: testOrderId,
          rating: 5,
          content: '测试评价内容'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('只能评价已完成的订单');
    });

    test('should return 400 for duplicate evaluation', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          orderId: completedOrderId,
          rating: 4,
          content: '测试评价内容-重复'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('该订单已评价，不能重复评价');
    });

    test('should create evaluation without content (optional)', async () => {
      // Create another completed order
      const [newOrder] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, description, contactPhone, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', NOW())`,
        [2, '水电维修', '1号楼', '103', '测试已完成订单-无内容评价', '13800138003']
      );

      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          orderId: newOrder.insertId,
          rating: 4
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('评价成功');
      expect(response.body.data.rating).toBe(4);
      expect([null, undefined]).toContain(response.body.data.content);
    });
  });

  describe('GET /api/evaluations - Get my evaluations', () => {
    test('should get my evaluations successfully', async () => {
      const response = await request(app)
        .get('/api/evaluations')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('获取成功');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify structure
      const evaluation = response.body.data[0];
      expect(evaluation).toHaveProperty('evaluationId');
      expect(evaluation).toHaveProperty('orderId');
      expect(evaluation).toHaveProperty('rating');
      expect(evaluation).toHaveProperty('content');
      expect(evaluation).toHaveProperty('createdAt');
      expect(evaluation).toHaveProperty('orderDescription');
    });

    test('should return empty array for user without evaluations', async () => {
      const response = await request(app)
        .get('/api/evaluations')
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('获取成功');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('GET /api/evaluations/admin - Get all evaluations (admin)', () => {
    test('should get all evaluations successfully for admin', async () => {
      const response = await request(app)
        .get('/api/evaluations/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('获取成功');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify structure
      const evaluation = response.body.data[0];
      expect(evaluation).toHaveProperty('evaluationId');
      expect(evaluation).toHaveProperty('orderId');
      expect(evaluation).toHaveProperty('rating');
      expect(evaluation).toHaveProperty('content');
      expect(evaluation).toHaveProperty('createdAt');
      expect(evaluation).toHaveProperty('username');
      expect(evaluation).toHaveProperty('realName');
      expect(evaluation).toHaveProperty('orderDescription');
    });
  });
});
