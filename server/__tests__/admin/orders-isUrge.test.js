/**
 * 测试：管理员订单列表 isUrge 筛选功能
 * 
 * GET /api/admin/orders?isUrge=true
 * - 返回仅催促订单
 * - 返回数据包含 is_urge, urge_time 字段
 */
const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../middleware/auth');

describe('Admin Orders - isUrge Filter', () => {
  let adminToken;
  let studentToken;
  let testOrderId;
  let adminId;
  let studentId;

  beforeAll(async () => {
    // 获取或创建测试管理员 - 尝试使用 'admin' 角色（旧 schema）或 'super_admin'（新 schema）
    const [existingAdmin] = await pool.execute(
      "SELECT userId, username, role FROM users WHERE role IN ('admin', 'super_admin') LIMIT 1"
    );

    if (existingAdmin.length > 0) {
      // 使用现有管理员
      adminId = existingAdmin[0].userId;
      const adminRole = existingAdmin[0].role;
      
      // 更新密码为已知值
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.execute(
        'UPDATE users SET password = ? WHERE userId = ?',
        [hashedPassword, adminId]
      );

      adminToken = jwt.sign(
        { userId: adminId, username: existingAdmin[0].username, role: adminRole },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    } else {
      // 创建新的 super_admin
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const [result] = await pool.execute(
        "INSERT INTO users (username, password, role, realName) VALUES (?, ?, 'super_admin', '测试管理员')",
        ['test_admin_isUrge', hashedPassword]
      );
      adminId = result.insertId;
      
      // 由于路由使用 authorize(['admin'])，需要用 'admin' 角色
      // 更新为 'admin' 角色（假设数据库支持）
      try {
        await pool.execute(
          "UPDATE users SET role = 'admin' WHERE userId = ?",
          [adminId]
        );
      } catch (e) {
        // 如果不支持 'admin'，保持 'super_admin'
      }

      adminToken = jwt.sign(
        { userId: adminId, username: 'test_admin_isUrge', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    // 获取或创建测试学生
    const [existingStudent] = await pool.execute(
      "SELECT userId FROM users WHERE role = 'student' LIMIT 1"
    );

    if (existingStudent.length > 0) {
      studentId = existingStudent[0].userId;
      const hashedPassword = await bcrypt.hash('student123', 10);
      await pool.execute(
        'UPDATE users SET password = ? WHERE userId = ?',
        [hashedPassword, studentId]
      );

      studentToken = jwt.sign(
        { userId: studentId, username: 'student', role: 'student' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    } else {
      const hashedPassword = await bcrypt.hash('student123', 10);
      const [result] = await pool.execute(
        "INSERT INTO users (username, password, role, realName, phone) VALUES (?, ?, 'student', '测试学生', '13800000000')",
        ['test_student_isUrge', hashedPassword]
      );
      studentId = result.insertId;

      studentToken = jwt.sign(
        { userId: studentId, username: 'test_student_isUrge', role: 'student' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }
  });

  afterAll(async () => {
    // 清理测试数据
    if (testOrderId) {
      await pool.execute('DELETE FROM orderImages WHERE orderId = ?', [testOrderId]);
      await pool.execute('DELETE FROM completionImages WHERE orderId = ?', [testOrderId]);
      await pool.execute('DELETE FROM repairOrders WHERE orderId = ?', [testOrderId]);
    }
    
    await pool.end();
  });

  describe('GET /api/admin/orders', () => {
    test('应返回所有订单，包含 is_urge 和 urge_time 字段', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // 检查返回的订单对象包含新字段
      if (res.body.data.length > 0) {
        const order = res.body.data[0];
        expect(order).toHaveProperty('is_urge');
        expect(order).toHaveProperty('urge_time');
      }
    });

    test('?isUrge=true 应仅返回催促订单', async () => {
      // 先创建一个催促订单
      const [orderResult] = await pool.execute(
        `INSERT INTO repairOrders 
         (userId, repairType, building, roomNumber, contactPhone, description, status, is_urge, urge_time)
         VALUES (?, 'water', '1', '101', '13800000001', '测试催单', 'pending', TRUE, NOW())`,
        [studentId]
      );
      testOrderId = orderResult.insertId;

      // 测试筛选
      const res = await request(app)
        .get('/api/admin/orders?isUrge=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // 所有返回的订单 should be urged
      if (res.body.data.length > 0) {
        res.body.data.forEach(order => {
          expect(order.is_urge).toBeTruthy(); // MySQL 返回 1 而非 true
          expect(order.urge_time).not.toBeNull();
        });
      }
    });

    test('?isUrge=false 应返回非催促订单', async () => {
      const res = await request(app)
        .get('/api/admin/orders?isUrge=false')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // 所有返回的订单应该是非催促的
      if (res.body.data.length > 0) {
        res.body.data.forEach(order => {
          expect(order.is_urge).toBeFalsy(); // MySQL 返回 0 而非 false
        });
      }
    });

    test('不传 isUrge 参数应返回所有订单', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('isUrge 筛选应与日期筛选兼容', async () => {
      const res = await request(app)
        .get('/api/admin/orders?isUrge=true&startDate=2024-01-01&endDate=2026-12-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // 返回的应该是催促订单
      if (res.body.data.length > 0) {
        res.body.data.forEach(order => {
          expect(order.is_urge).toBeTruthy(); // MySQL 返回 1 而非 true
        });
      }

    test('无效 isUrge 值应被忽略，返回所有订单', async () => {
      const res = await request(app)
        .get('/api/admin/orders?isUrge=invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('学生用户应无法访问管理员订单列表', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });
});
