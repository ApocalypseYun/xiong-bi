const mysql = require('mysql2/promise');
require('dotenv').config();

// Test database configuration
const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_TEST_NAME || 'dormitory_repair_test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let testPool;

// Setup before all tests
beforeAll(async () => {
  testPool = mysql.createPool(testDbConfig);
  global.__TEST_DB__ = testPool;
  
  // Database connection will be verified when DB is configured
  // try {
  //   const connection = await testPool.getConnection();
  //   console.log('✓ Test database connected successfully');
  //   connection.release();
  // } catch (error) {
  //   console.error('✗ Failed to connect to test database:', error.message);
  //   throw error;
  // }
});
  // try {
  //   const connection = await testPool.getConnection();
  //   console.log('✓ Test database connected successfully');
  //   connection.release();
  // } catch (error) {
  //   console.error('✗ Failed to connect to test database:', error.message);
  //   throw error;
  // }

// Cleanup after each test
afterEach(async () => {
  if (!testPool) return;
  
  try {
    // Clean up test data (preserve base schema)
    await testPool.execute('SET FOREIGN_KEY_CHECKS = 0');
    await testPool.execute('TRUNCATE TABLE repairOrders');
    await testPool.execute('TRUNCATE TABLE evaluations');
    await testPool.execute('TRUNCATE TABLE residents');
    await testPool.execute('SET FOREIGN_KEY_CHECKS = 1');
  } catch (error) {
    console.warn('Warning: Failed to clean test data:', error.message);
  }
});

// Teardown after all tests
afterAll(async () => {
  if (testPool) {
    await testPool.end();
    console.log('✓ Test database connection closed');
  }
});

// Export for use in tests
module.exports = { getTestDb: () => testPool };
