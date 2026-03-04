/**
 * Migration Test: 001_multi_role_system.sql
 * 
 * 测试目标：验证多角色系统迁移是否成功
 * 
 * 前置条件：
 * 1. 已执行 001_multi_role_system.sql 迁移
 * 2. 数据库连接配置正确
 * 
 * 验证项：
 * - users 表包含 email 字段
 * - users.role 支持 ('student', 'repairman', 'super_admin')
 * - 原 admin 用户已升级为 super_admin
 * - 原有数据未丢失
 */

const pool = require('../../config/database');

describe('Migration 001: Multi-Role System', () => {
  let connection;

  beforeAll(async () => {
    connection = await pool.getConnection();
  });

  afterAll(async () => {
    if (connection) {
      connection.release();
    }
    await pool.end();
  });

  describe('Schema Changes', () => {
    test('users 表应包含 email 字段', async () => {
      const [rows] = await connection.query(
        "SHOW COLUMNS FROM users LIKE 'email'"
      );
      
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].Field).toBe('email');
      expect(rows[0].Type).toBe('varchar(100)');
      expect(rows[0].Null).toBe('YES'); // 允许 NULL
    });

    test('users.role 应支持三角色体系', async () => {
      const [rows] = await connection.query(
        "SHOW COLUMNS FROM users LIKE 'role'"
      );
      
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].Field).toBe('role');
      
      // 验证 ENUM 值包含三个角色
      const type = rows[0].Type;
      expect(type).toContain('student');
      expect(type).toContain('repairman');
      expect(type).toContain('super_admin');
    });

    test('email 字段应有索引', async () => {
      const [rows] = await connection.query(
        "SHOW INDEX FROM users WHERE Key_name = 'idx_email'"
      );
      
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe('Data Migration', () => {
    test('原 admin 用户应升级为 super_admin', async () => {
      const [rows] = await connection.query(
        "SELECT userId, username, role, email FROM users WHERE username = 'admin'"
      );
      
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].role).toBe('super_admin');
    });

    test('不应存在 role = admin 的用户', async () => {
      const [rows] = await connection.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
      );
      
      expect(rows[0].count).toBe(0);
    });

    test('学生用户数据应保持完整', async () => {
      const [rows] = await connection.query(
        "SELECT userId, username, role, realName, roomNumber, building FROM users WHERE username = '2024001'"
      );
      
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].role).toBe('student');
      expect(rows[0].realName).toBe('张三');
      expect(rows[0].roomNumber).toBe('101');
      expect(rows[0].building).toBe('A栋');
    });

    test('email 字段初始应为 NULL', async () => {
      const [rows] = await connection.query(
        "SELECT userId, email FROM users LIMIT 5"
      );
      
      rows.forEach(row => {
        expect(row.email).toBeNull();
      });
    });
  });

  describe('Data Integrity', () => {
    test('所有用户应有有效的 userId', async () => {
      const [rows] = await connection.query(
        "SELECT userId, username FROM users"
      );
      
      rows.forEach(row => {
        expect(row.userId).toBeDefined();
        expect(row.userId).toBeGreaterThan(0);
        expect(row.username).toBeDefined();
      });
    });

    test('角色值应符合 ENUM 定义', async () => {
      const [rows] = await connection.query(
        "SELECT DISTINCT role FROM users"
      );
      
      const validRoles = ['student', 'repairman', 'super_admin'];
      rows.forEach(row => {
        expect(validRoles).toContain(row.role);
      });
    });
  });
});
