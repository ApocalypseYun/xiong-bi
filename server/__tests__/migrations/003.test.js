/**
 * Migration 003: Order Enhancements Tests
 * 
 * Tests for:
 * - repairOrders: is_urge, urge_time fields, withdrawn status
 * - evaluations: repairman_rating, repairman_comment, repairman_evaluated_at
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

describe('Migration 003: Order Enhancements', () => {
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

  describe('repairOrders table enhancements', () => {
    test('should have is_urge column', async () => {
      const [rows] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'repairOrders' AND COLUMN_NAME = 'is_urge'
      `, [process.env.DB_NAME || 'dormitory_repair']);
      
      expect(rows.length).toBe(1);
      expect(rows[0].DATA_TYPE).toBe('tinyint');
      expect(rows[0].COLUMN_DEFAULT).toBe('0'); // BOOLEAN DEFAULT FALSE
    });

    test('should have urge_time column', async () => {
      const [rows] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'repairOrders' AND COLUMN_NAME = 'urge_time'
      `, [process.env.DB_NAME || 'dormitory_repair']);
      
      expect(rows.length).toBe(1);
      expect(rows[0].DATA_TYPE).toBe('datetime');
    });

    test('should have withdrawn status in ENUM', async () => {
      const [rows] = await connection.execute(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'repairOrders' AND COLUMN_NAME = 'status'
      `, [process.env.DB_NAME || 'dormitory_repair']);
      
      expect(rows.length).toBe(1);
      const columnType = rows[0].COLUMN_TYPE.toLowerCase();
      expect(columnType).toContain('withdrawn');
      expect(columnType).toContain('pending');
      expect(columnType).toContain('processing');
      expect(columnType).toContain('completed');
    });

    test('should have idx_urge index on (is_urge, urge_time)', async () => {
      const [rows] = await connection.execute(`
        SELECT INDEX_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'repairOrders' AND INDEX_NAME = 'idx_urge'
      `, [process.env.DB_NAME || 'dormitory_repair']);
      
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe('evaluations table enhancements', () => {
    test('should have repairman_rating column', async () => {
      const [rows] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'evaluations' AND COLUMN_NAME = 'repairman_rating'
      `, [process.env.DB_NAME || 'dormitory_repair']);
      
      expect(rows.length).toBe(1);
      expect(rows[0].DATA_TYPE).toBe('tinyint');
    });

    test('should have repairman_comment column', async () => {
      const [rows] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'evaluations' AND COLUMN_NAME = 'repairman_comment'
      `, [process.env.DB_NAME || 'dormitory_repair']);
      
      expect(rows.length).toBe(1);
      expect(rows[0].DATA_TYPE).toBe('text');
    });

    test('should have repairman_evaluated_at column', async () => {
      const [rows] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'evaluations' AND COLUMN_NAME = 'repairman_evaluated_at'
      `, [process.env.DB_NAME || 'dormitory_repair']);
      
      expect(rows.length).toBe(1);
      expect(rows[0].DATA_TYPE).toBe('datetime');
    });
  });

  describe('Data integrity', () => {
    test('existing repairOrders should have default values for new fields', async () => {
      const [rows] = await connection.execute(`
        SELECT orderId, is_urge, urge_time 
        FROM repairOrders 
        LIMIT 1
      `);
      
      // If there are existing orders, they should have default values
      if (rows.length > 0) {
        expect(rows[0].is_urge).toBe(0);
        expect(rows[0].urge_time).toBeNull();
      }
    });

    test('existing evaluations should have NULL for new repairman fields', async () => {
      const [rows] = await connection.execute(`
        SELECT evaluationId, repairman_rating, repairman_comment, repairman_evaluated_at 
        FROM evaluations 
        LIMIT 1
      `);
      
      // If there are existing evaluations, they should have NULL for repairman fields
      if (rows.length > 0) {
        expect(rows[0].repairman_rating).toBeNull();
        expect(rows[0].repairman_comment).toBeNull();
        expect(rows[0].repairman_evaluated_at).toBeNull();
      }
    });
  });
});
