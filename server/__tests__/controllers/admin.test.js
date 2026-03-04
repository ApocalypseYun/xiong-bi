const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/database');
const jwt = require('jsonwebtoken');

describe('Admin API - /api/admin', () => {
  const adminToken = jwt.sign(
    { userId: 1, role: 'admin' },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  const studentToken = jwt.sign(
    { userId: 2, role: 'student' },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  let testOrderId;
  let processingOrderId;
  let completedOrderId;
  const testUserPrefix = 'TESTADMIN';

  // Setup test data
  beforeAll(async () => {
    try {
      // Create test user
      const [userResult] = await pool.execute(
        `INSERT INTO users (username, password, role, realName, roomNumber, building)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`${testUserPrefix}_USER`, 'hashedpassword', 'student', '测试学生', '101', 'A栋']
      );
      const testUserId = userResult.insertId;

      // Create pending order
      const [pendingResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [testUserId, '水电', 'A栋', '101', '13800138000', '测试待处理报修']
      );
      testOrderId = pendingResult.insertId;

      // Add image to pending order
      await pool.execute(
        `INSERT INTO orderImages (orderId, imageUrl) VALUES (?, ?)`,
        [testOrderId, '/test/image.jpg']
      );

      // Create processing order
      const [processingResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, adminId)
         VALUES (?, ?, ?, ?, ?, ?, 'processing', 1)`,
        [testUserId, '门锁', 'B栋', '202', '13900139000', '测试处理中报修']
      );
      processingOrderId = processingResult.insertId;

      // Add image to processing order
      await pool.execute(
        `INSERT INTO orderImages (orderId, imageUrl) VALUES (?, ?)`,
        [processingOrderId, '/test/image2.jpg']
      );

      // Create completed order
      const [completedResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, adminId, completedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', 1, NOW())`,
        [testUserId, '空调', 'C栋', '303', '13700137000', '测试已完成报修']
      );
      completedOrderId = completedResult.insertId;

      // Add images to completed order
      await pool.execute(
        `INSERT INTO orderImages (orderId, imageUrl) VALUES (?, ?)`,
        [completedOrderId, '/test/image3.jpg']
      );
      await pool.execute(
        `INSERT INTO completionImages (orderId, imageUrl, uploadedBy) VALUES (?, ?, ?)`,
        [completedOrderId, '/test/completion.jpg', 1]
      );

      // Create urged order
      const [urgeResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, is_urge, urge_time)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', TRUE, NOW())`,
        [testUserId, '网络', 'D栋', '404', '13600136000', '测试催单报修']
      );

    } catch (error) {
      console.error('Setup error:', error);
    }
  });

  // Cleanup test data
  afterAll(async () => {
    try {
      // Delete test orders (cascade will delete images)
      await pool.execute(`DELETE FROM completionImages WHERE imageUrl LIKE '/test/%'`);
      await pool.execute(`DELETE FROM orderImages WHERE imageUrl LIKE '/test/%'`);
      await pool.execute(`DELETE FROM repairOrders WHERE description LIKE '测试%'`);
      await pool.execute(`DELETE FROM users WHERE username LIKE ?`, [`${testUserPrefix}%`]);
    } catch (error) {
      // Ignore cleanup errors
    } finally {
      await pool.end();
    }
  });

  describe('Authentication & Authorization', () => {
    test('should return 401 without token for GET /orders', async () => {
      const response = await request(app)
        .get('/api/admin/orders');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 401 without token for GET /orders/pending', async () => {
      const response = await request(app)
        .get('/api/admin/orders/pending');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 401 without token for PUT /orders/:id/accept', async () => {
      const response = await request(app)
        .put('/api/admin/orders/1/accept');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 401 without token for PUT /orders/:id/complete', async () => {
      const response = await request(app)
        .put('/api/admin/orders/1/complete')
        .send({ completionImageUrls: ['/test.jpg'] });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 403 for student role for GET /orders', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    test('should return 403 for student role for PUT /orders/:id/accept', async () => {
      const response = await request(app)
        .put('/api/admin/orders/1/accept')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/admin/orders - Get all orders', () => {
    test('should get all orders successfully', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('获取订单列表成功');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter orders by startDate', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/admin/orders?startDate=${today}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter orders by endDate', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/admin/orders?endDate=${today}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter orders by both startDate and endDate', async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/admin/orders?startDate=${yesterday}&endDate=${today}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter orders by isUrge=true', async () => {
      const response = await request(app)
        .get('/api/admin/orders?isUrge=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      // All returned orders should have is_urge = true (MySQL returns 1 for TRUE)
      response.body.data.forEach(order => {
        expect([true, 1]).toContain(order.is_urge);
      });
    });

    test('should filter orders by isUrge=false', async () => {
      const response = await request(app)
        .get('/api/admin/orders?isUrge=false')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      // All returned orders should have is_urge = false (MySQL returns 0 for FALSE)
      response.body.data.forEach(order => {
        expect([false, 0]).toContain(order.is_urge);
      });
    });

    test('should include images and completionImages for completed orders', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // Find completed order
      const completedOrder = response.body.data.find(o => o.orderId === completedOrderId);
      expect(completedOrder).toBeDefined();
      expect(completedOrder.images).toBeDefined();
      expect(Array.isArray(completedOrder.images)).toBe(true);
      expect(completedOrder.completionImages).toBeDefined();
      expect(Array.isArray(completedOrder.completionImages)).toBe(true);
    });
  });

  describe('GET /api/admin/orders/pending - Get pending orders', () => {
    test('should get pending orders successfully', async () => {
      const response = await request(app)
        .get('/api/admin/orders/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('获取待处理订单成功');
      expect(Array.isArray(response.body.data)).toBe(true);
      // All returned orders should be pending or processing
      response.body.data.forEach(order => {
        expect(['pending', 'processing']).toContain(order.status);
      });
    });

    test('should include images for pending orders', async () => {
      const response = await request(app)
        .get('/api/admin/orders/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // Find our test pending order
      const testOrder = response.body.data.find(o => o.orderId === testOrderId);
      if (testOrder) {
        expect(testOrder.images).toBeDefined();
        expect(Array.isArray(testOrder.images)).toBe(true);
      }
    });
  });

  describe('PUT /api/admin/orders/:id/accept - Accept order', () => {
    let acceptTestId;

    beforeEach(async () => {
      // Create a fresh pending order for each test
      const [users] = await pool.execute(
        `SELECT userId FROM users WHERE username LIKE ?`,
        [`${testUserPrefix}%`]
      );
      const userId = users[0]?.userId;

      const [result] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [userId, '水电', 'A栋', '101', '13800138000', '测试接单报修']
      );
      acceptTestId = result.insertId;
    });

    afterEach(async () => {
      try {
        await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [acceptTestId]);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    test('should accept order successfully', async () => {
      const response = await request(app)
        .put(`/api/admin/orders/${acceptTestId}/accept`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('接单成功');
      expect(response.body.data.orderId).toBe(acceptTestId);
      expect(response.body.data.status).toBe('processing');
    });

    test('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .put('/api/admin/orders/99999/accept')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('订单不存在');
    });

    test('should return 400 for already processed order', async () => {
      // First accept the order
      await request(app)
        .put(`/api/admin/orders/${acceptTestId}/accept`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Try to accept again
      const response = await request(app)
        .put(`/api/admin/orders/${acceptTestId}/accept`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('该订单已被处理或已完成');
    });

    test('should return 400 for completed order', async () => {
      const response = await request(app)
        .put(`/api/admin/orders/${completedOrderId}/accept`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('该订单已被处理或已完成');
    });
  });

  describe('PUT /api/admin/orders/:id/complete - Complete order', () => {
    let completeTestId;

    beforeEach(async () => {
      // Create a fresh processing order for each test
      const [users] = await pool.execute(
        `SELECT userId FROM users WHERE username LIKE ?`,
        [`${testUserPrefix}%`]
      );
      const userId = users[0]?.userId;

      const [result] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, adminId)
         VALUES (?, ?, ?, ?, ?, ?, 'processing', 1)`,
        [userId, '水电', 'A栋', '101', '13800138000', '测试完成报修']
      );
      completeTestId = result.insertId;
    });

    afterEach(async () => {
      try {
        await pool.execute('DELETE FROM completionImages WHERE orderId = ?', [completeTestId]);
        await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [completeTestId]);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    test('should complete order successfully', async () => {
      const response = await request(app)
        .put(`/api/admin/orders/${completeTestId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ completionImageUrls: ['/test/completion1.jpg', '/test/completion2.jpg'] });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('完成报修');
      expect(response.body.data.orderId).toBe(completeTestId);
      expect(response.body.data.status).toBe('completed');
    });

    test('should return 400 for missing completionImageUrls', async () => {
      const response = await request(app)
        .put(`/api/admin/orders/${completeTestId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('请上传完成凭证图片');
    });

    test('should return 400 for empty completionImageUrls array', async () => {
      const response = await request(app)
        .put(`/api/admin/orders/${completeTestId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ completionImageUrls: [] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('请上传完成凭证图片');
    });

    test('should return 400 for completionImageUrls not array', async () => {
      const response = await request(app)
        .put(`/api/admin/orders/${completeTestId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ completionImageUrls: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('请上传完成凭证图片');
    });

    test('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .put('/api/admin/orders/99999/complete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ completionImageUrls: ['/test.jpg'] });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('订单不存在');
    });

    test('should return 400 for pending order (need to accept first)', async () => {
      const response = await request(app)
        .put(`/api/admin/orders/${testOrderId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ completionImageUrls: ['/test.jpg'] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('请先接单再完成');
    });

    test('should return 400 for already completed order', async () => {
      const response = await request(app)
        .put(`/api/admin/orders/${completedOrderId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ completionImageUrls: ['/test.jpg'] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('该订单已完成');
    });
  });
});
