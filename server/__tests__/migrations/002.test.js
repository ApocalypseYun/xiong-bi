/**
 * Test: residents table migration
 * Migration: 002_residents_table.sql
 * 
 * Validates:
 * - residents table structure (6 core fields)
 * - student_id UNIQUE constraint
 * - Indexes (idx_student, idx_room)
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

describe('Migration 002: residents table', () => {
  let connection;

  beforeAll(async () => {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dormitory_repair'
    });
  });

  afterAll(async () => {
    if (connection) {
      await connection.end();
    }
  });

  describe('Table structure', () => {
    test('residents table should exist', async () => {
      const [rows] = await connection.query(
        "SHOW TABLES LIKE 'residents'"
      );
      expect(rows.length).toBe(1);
    });

    test('should have 6 core fields', async () => {
      const [rows] = await connection.query(
        "DESCRIBE residents"
      );
      
      const fieldNames = rows.map(row => row.Field);
      
      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('student_id');
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('phone');
      expect(fieldNames).toContain('building');
      expect(fieldNames).toContain('room_number');
      expect(fieldNames).toContain('created_at');
    });

    test('student_id should be UNIQUE and NOT NULL', async () => {
      const [rows] = await connection.query(
        "DESCRIBE residents"
      );
      
      const studentIdField = rows.find(row => row.Field === 'student_id');
      
      expect(studentIdField).toBeDefined();
      expect(studentIdField.Null).toBe('NO');
      expect(studentIdField.Key).toBe('UNI');
    });

    test('id should be PRIMARY KEY AUTO_INCREMENT', async () => {
      const [rows] = await connection.query(
        "DESCRIBE residents"
      );
      
      const idField = rows.find(row => row.Field === 'id');
      
      expect(idField).toBeDefined();
      expect(idField.Key).toBe('PRI');
      expect(idField.Extra).toContain('auto_increment');
    });
  });

  describe('Constraints', () => {
    test('student_id UNIQUE constraint should prevent duplicates', async () => {
      // First insert
      await connection.query(
        "INSERT INTO residents (student_id, name, phone, building, room_number) VALUES (?, ?, ?, ?, ?)",
        ['TEST001', 'Test User', '13800138000', 'A栋', '101']
      );

      // Try duplicate insert
      await expect(
        connection.query(
          "INSERT INTO residents (student_id, name, phone, building, room_number) VALUES (?, ?, ?, ?, ?)",
          ['TEST001', 'Test User 2', '13900139000', 'B栋', '202']
        )
      ).rejects.toThrow();

      // Cleanup
      await connection.query("DELETE FROM residents WHERE student_id = 'TEST001'");
    });
  });

  describe('Indexes', () => {
    test('should have idx_student index on student_id', async () => {
      const [rows] = await connection.query(
        "SHOW INDEX FROM residents WHERE Key_name = 'idx_student'"
      );
      
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].Column_name).toBe('student_id');
    });

    test('should have idx_room composite index on building and room_number', async () => {
      const [rows] = await connection.query(
        "SHOW INDEX FROM residents WHERE Key_name = 'idx_room'"
      );
      
      expect(rows.length).toBe(2);
      
      const columns = rows.map(row => row.Column_name);
      expect(columns).toContain('building');
      expect(columns).toContain('room_number');
    });
  });
});
