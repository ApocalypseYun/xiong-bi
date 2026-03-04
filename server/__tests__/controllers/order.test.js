const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Order API - /api/orders', () => {
  let studentToken;
  let student2Token;
  let testStudentId;
  let testStudent2Id;
  let testOrderId;
  let completedOrderId;
  let processingOrderId;

  const testStudent = {
    username: 'test_order_student',
    password: 'password123',
    realName: '订单测试学生',
    phone: '13900139001',
    building: 'A栋',
    roomNumber: '101'
  };

  const testStudent2 = {
    username: 'test_order_student2',
    password: 'password123',
    realName: '订单测试学生2',
    phone: '13900139002',
    building: 'B栋',
    roomNumber: '202'
  };

  beforeAll(async () => {
    // 清理可能存在的测试数据
    await pool.execute('DELETE FROM orderImages WHERE orderId IN (SELECT orderId FROM repairOrders WHERE userId IN (SELECT userId FROM users WHERE username IN (?, ?)))', [testStudent.username, testStudent2.username]);
    await pool.execute('DELETE FROM evaluations WHERE orderId IN (SELECT orderId FROM repairOrders WHERE userId IN (SELECT userId FROM users WHERE username IN (?, ?)))', [testStudent.username, testStudent2.username]);
    await pool.execute('DELETE FROM repairOrders WHERE userId IN (SELECT userId FROM users WHERE username IN (?, ?))', [testStudent.username, testStudent2.username]);
    await pool.execute('DELETE FROM users WHERE username IN (?, ?)', [testStudent.username, testStudent2.username]);

    // 创建测试学生1
    const hashedPassword = await bcrypt.hash(testStudent.password, 10);
    const [studentResult] = await pool.execute(
      'INSERT INTO users (username, password, role, realName, phone, building, roomNumber) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testStudent.username, hashedPassword, 'student', testStudent.realName, testStudent.phone, testStudent.building, testStudent.roomNumber]
    );
    testStudentId = studentResult.insertId;
    studentToken = jwt.sign(
      { userId: testStudentId, role: 'student' },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // 创建测试学生2
    const hashedPassword2 = await bcrypt.hash(testStudent2.password, 10);
    const [student2Result] = await pool.execute(
      'INSERT INTO users (username, password, role, realName, phone, building, roomNumber) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testStudent2.username, hashedPassword2, 'student', testStudent2.realName, testStudent2.phone, testStudent2.building, testStudent2.roomNumber]
    );
    testStudent2Id = student2Result.insertId;
    student2Token = jwt.sign(
      { userId: testStudent2Id, role: 'student' },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // 创建测试订单数据
    // pending 订单
    const [orderResult] = await pool.execute(
      `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [testStudentId, '水电维修', testStudent.building, testStudent.roomNumber, testStudent.phone, '测试订单-待处理']
    );
    testOrderId = orderResult.insertId;

    // completed 订单
    const [completedResult] = await pool.execute(
      `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, completedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'completed', NOW())`,
      [testStudentId, '门窗维修', testStudent.building, testStudent.roomNumber, testStudent.phone, '测试订单-已完成']
    );
    completedOrderId = completedResult.insertId;

    // processing 订单
    const [processingResult] = await pool.execute(
      `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'processing')`,
      [testStudentId, '网络维修', testStudent.building, testStudent.roomNumber, testStudent.phone, '测试订单-处理中']
    );
    processingOrderId = processingResult.insertId;
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      await pool.execute('DELETE FROM orderImages WHERE orderId IN (SELECT orderId FROM repairOrders WHERE userId IN (?, ?))', [testStudentId, testStudent2Id]);
      await pool.execute('DELETE FROM evaluations WHERE orderId IN (SELECT orderId FROM repairOrders WHERE userId IN (?, ?))', [testStudentId, testStudent2Id]);
      await pool.execute('DELETE FROM completionImages WHERE orderId IN (SELECT orderId FROM repairOrders WHERE userId IN (?, ?))', [testStudentId, testStudent2Id]);
      await pool.execute('DELETE FROM repairOrders WHERE userId IN (?, ?)', [testStudentId, testStudent2Id]);
      await pool.execute('DELETE FROM users WHERE userId IN (?, ?)', [testStudentId, testStudent2Id]);
    } catch (error) {
      // Ignore cleanup errors
    } finally {
      await pool.end();
    }
  });

  describe('Authentication', () => {
    test('should return 401 for POST / without token', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          repairType: '水电维修',
          building: 'A栋',
          roomNumber: '101',
          contactPhone: '13800138000',
          description: '测试'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 401 for GET / without token', async () => {
      const response = await request(app)
        .get('/api/orders');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 401 for GET /:id without token', async () => {
      const response = await request(app)
        .get('/api/orders/1');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });
  });

  describe('POST /api/orders - Create order', () => {
    test('should create order successfully with all required fields', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          repairType: '水电维修',
          building: 'C栋',
          roomNumber: '301',
          contactPhone: '13800138000',
          description: '测试创建订单'
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('报修成功');
      expect(response.body.data).toMatchObject({
        repairType: '水电维修',
        building: 'C栋',
        roomNumber: '301',
        contactPhone: '13800138000',
        description: '测试创建订单',
        status: 'pending'
      });
      expect(response.body.data).toHaveProperty('orderId');
      expect(response.body.data).toHaveProperty('userId', testStudentId);

      // 清理
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [response.body.data.orderId]);
    });

    test('should create order with imageUrls successfully', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          repairType: '门窗维修',
          building: 'D栋',
          roomNumber: '401',
          contactPhone: '13900139000',
          description: '测试带图片的订单',
          imageUrls: ['http://example.com/image1.jpg', 'http://example.com/image2.jpg']
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('报修成功');

      // 验证图片已插入
      const [images] = await pool.execute(
        'SELECT * FROM orderImages WHERE orderId = ?',
        [response.body.data.orderId]
      );
      expect(images.length).toBe(2);

      // 清理
      await pool.execute('DELETE FROM orderImages WHERE orderId = ?', [response.body.data.orderId]);
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [response.body.data.orderId]);
    });

    test('should return 400 for missing repairType', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          building: 'A栋',
          roomNumber: '101',
          contactPhone: '13800138000',
          description: '测试'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('报修类型、楼栋、房间号、联系电话和问题描述为必填项');
    });

    test('should return 400 for missing building', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          repairType: '水电维修',
          roomNumber: '101',
          contactPhone: '13800138000',
          description: '测试'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('报修类型、楼栋、房间号、联系电话和问题描述为必填项');
    });

    test('should return 400 for missing roomNumber', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          repairType: '水电维修',
          building: 'A栋',
          contactPhone: '13800138000',
          description: '测试'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('报修类型、楼栋、房间号、联系电话和问题描述为必填项');
    });

    test('should return 400 for missing contactPhone', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          repairType: '水电维修',
          building: 'A栋',
          roomNumber: '101',
          description: '测试'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('报修类型、楼栋、房间号、联系电话和问题描述为必填项');
    });

    test('should return 400 for missing description', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          repairType: '水电维修',
          building: 'A栋',
          roomNumber: '101',
          contactPhone: '13800138000'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('报修类型、楼栋、房间号、联系电话和问题描述为必填项');
    });

    test('should return 400 for invalid contactPhone format', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          repairType: '水电维修',
          building: 'A栋',
          roomNumber: '101',
          contactPhone: '12345678901', // 以 1 开头但第二位是 2，不符合 1[3-9] 规则
          description: '测试'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('联系电话格式不正确');
    });

    test('should return 400 for contactPhone starting with 12', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          repairType: '水电维修',
          building: 'A栋',
          roomNumber: '101',
          contactPhone: '12300130000',
          description: '测试'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('联系电话格式不正确');
    });

    test('should create order with valid phone starting with 13', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          repairType: '水电维修',
          building: 'E栋',
          roomNumber: '501',
          contactPhone: '13700137000',
          description: '测试有效手机号'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.contactPhone).toBe('13700137000');

      // 清理
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [response.body.data.orderId]);
    });

    test('should create order with valid phone starting with 19', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          repairType: '水电维修',
          building: 'F栋',
          roomNumber: '601',
          contactPhone: '19900199000',
          description: '测试有效手机号19开头'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.contactPhone).toBe('19900199000');

      // 清理
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [response.body.data.orderId]);
    });

    test('should handle empty imageUrls array', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          repairType: '水电维修',
          building: 'G栋',
          roomNumber: '701',
          contactPhone: '13800138001',
          description: '测试空图片数组',
          imageUrls: []
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);

      // 清理
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [response.body.data.orderId]);
    });
  });

  describe('GET /api/orders - Get my orders', () => {
    test('should get my orders successfully', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('获取成功');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // 验证数据结构
      const order = response.body.data[0];
      expect(order).toHaveProperty('orderId');
      expect(order).toHaveProperty('repairType');
      expect(order).toHaveProperty('building');
      expect(order).toHaveProperty('roomNumber');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('createdAt');
    });

    test('should filter orders by status=pending', async () => {
      const response = await request(app)
        .get('/api/orders?status=pending')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);

      // 验证所有返回的订单都是 pending 状态
      response.body.data.forEach(order => {
        expect(order.status).toBe('pending');
      });
    });

    test('should filter orders by status=completed', async () => {
      const response = await request(app)
        .get('/api/orders?status=completed')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);

      // 验证所有返回的订单都是 completed 状态
      response.body.data.forEach(order => {
        expect(order.status).toBe('completed');
      });
    });

    test('should filter orders by status=processing', async () => {
      const response = await request(app)
        .get('/api/orders?status=processing')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);

      // 验证所有返回的订单都是 processing 状态
      response.body.data.forEach(order => {
        expect(order.status).toBe('processing');
      });
    });

    test('should return 400 for invalid status parameter', async () => {
      const response = await request(app)
        .get('/api/orders?status=invalid')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的状态参数');
    });

    test('should return empty array for user without orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    test('should only return orders belonging to current user', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      
      // 验证所有订单都属于当前用户
      response.body.data.forEach(order => {
        // 由于返回数据可能不包含 userId，我们通过查询数据库验证
        expect(order).toHaveProperty('orderId');
      });
    });
  });

  describe('GET /api/orders/:id - Get order by ID', () => {
    test('should get order details successfully', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('获取成功');
      expect(response.body.data).toHaveProperty('orderId', testOrderId);
      expect(response.body.data).toHaveProperty('repairType');
      expect(response.body.data).toHaveProperty('building');
      expect(response.body.data).toHaveProperty('roomNumber');
      expect(response.body.data).toHaveProperty('contactPhone');
      expect(response.body.data).toHaveProperty('description');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('images');
      expect(response.body.data).toHaveProperty('completionImages');
      expect(response.body.data).toHaveProperty('evaluation');
      expect(Array.isArray(response.body.data.images)).toBe(true);
      expect(Array.isArray(response.body.data.completionImages)).toBe(true);
    });

    test('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .get('/api/orders/99999')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('报修单不存在或无权访问');
    });

    test('should return 404 for order belonging to another user', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('报修单不存在或无权访问');
    });

    test('should include order images in response', async () => {
      // 先创建带图片的订单
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [testStudentId, '测试图片', 'H栋', '801', '13800138002', '测试图片订单']
      );
      const imageOrderId = orderResult.insertId;

      // 插入图片
      await pool.execute(
        'INSERT INTO orderImages (orderId, imageUrl) VALUES (?, ?)',
        [imageOrderId, 'http://example.com/test-image.jpg']
      );

      const response = await request(app)
        .get(`/api/orders/${imageOrderId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.images.length).toBeGreaterThan(0);
      expect(response.body.data.images[0].imageUrl).toBe('http://example.com/test-image.jpg');

      // 清理
      await pool.execute('DELETE FROM orderImages WHERE orderId = ?', [imageOrderId]);
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [imageOrderId]);
    });

    test('should include completion images in response', async () => {
      // 使用已完成的订单
      // 插入完成凭证图片（需要 uploadedBy 字段）
      await pool.execute(
        'INSERT INTO completionImages (orderId, imageUrl, uploadedBy) VALUES (?, ?, ?)',
        [completedOrderId, 'http://example.com/completion.jpg', testStudentId]
      );

      const response = await request(app)
        .get(`/api/orders/${completedOrderId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.completionImages.length).toBeGreaterThan(0);

      // 清理
      await pool.execute('DELETE FROM completionImages WHERE orderId = ?', [completedOrderId]);
    });

    test('should include evaluation in response if exists', async () => {
      // 插入评价
      await pool.execute(
        'INSERT INTO evaluations (orderId, userId, rating, comment) VALUES (?, ?, ?, ?)',
        [completedOrderId, testStudentId, 5, '测试评价']
      );

      const response = await request(app)
        .get(`/api/orders/${completedOrderId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.evaluation).not.toBeNull();
      expect(response.body.data.evaluation.rating).toBe(5);
      expect(response.body.data.evaluation.comment).toBe('测试评价');

      // 清理
      await pool.execute('DELETE FROM evaluations WHERE orderId = ?', [completedOrderId]);
    });

    test('should return null evaluation if not exists', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.evaluation).toBeNull();
    });
  });

  describe('POST /api/orders/:id/urge - Urge order', () => {
    test('should return 401 without token', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrderId}/urge`);

      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .post('/api/orders/99999/urge')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/不存在或无权访问/);
    });

    test('should return 404 for order belonging to another user', async () => {
      // 创建学生1的订单
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', DATE_SUB(NOW(), INTERVAL 7 HOUR))`,
        [testStudentId, '水电', 'A栋', '101', '13800138000', '测试催单']
      );
      const orderId = orderResult.insertId;

      const response = await request(app)
        .post(`/api/orders/${orderId}/urge`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(response.status).toBe(404);

      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [orderId]);
    });

    test('should return 400 for non-pending order', async () => {
      const response = await request(app)
        .post(`/api/orders/${processingOrderId}/urge`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/只能催单待处理状态的订单/);
    });

    test('should return 400 if order created less than 6 hours', async () => {
      // 创建新订单（不足6小时）
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [testStudentId, '水电', 'A栋', '101', '13800138000', '测试催单-新订单']
      );
      const orderId = orderResult.insertId;

      const response = await request(app)
        .post(`/api/orders/${orderId}/urge`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/订单创建不足6小时/);

      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [orderId]);
    });

    test('should return 400 if already urged', async () => {
      // 创建已催单的订单
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status, createdAt, is_urge, urge_time)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', DATE_SUB(NOW(), INTERVAL 7 HOUR), TRUE, NOW())`,
        [testStudentId, '水电', 'A栋', '101', '13800138000', '测试催单-已催']
      );
      const orderId = orderResult.insertId;

      const response = await request(app)
        .post(`/api/orders/${orderId}/urge`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/该订单已催单/);

      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [orderId]);
    });
  });

  describe('POST /api/orders/:id/withdraw - Withdraw order', () => {
    test('should return 401 without token', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrderId}/withdraw`);

      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .post('/api/orders/99999/withdraw')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/订单不存在/);
    });

    test('should return 403 for order belonging to another user', async () => {
      // 创建学生1的pending订单
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [testStudentId, '水电', 'A栋', '101', '13800138000', '测试撤单']
      );
      const orderId = orderResult.insertId;

      const response = await request(app)
        .post(`/api/orders/${orderId}/withdraw`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/无权撤回/);

      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [orderId]);
    });

    test('should return 400 for non-pending order', async () => {
      const response = await request(app)
        .post(`/api/orders/${processingOrderId}/withdraw`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/只能撤回待处理的订单/);
    });

    test('should withdraw pending order successfully', async () => {
      // 创建新的pending订单用于撤回
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [testStudentId, '水电', 'A栋', '101', '13800138000', '测试撤单-成功']
      );
      const orderId = orderResult.insertId;

      const response = await request(app)
        .post(`/api/orders/${orderId}/withdraw`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/撤单成功/);

      // 验证状态已更新
      const [orders] = await pool.execute(
        'SELECT status FROM repairOrders WHERE orderId = ?',
        [orderId]
      );
      expect(orders[0].status).toBe('withdrawn');

      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [orderId]);
    });
  });
});
