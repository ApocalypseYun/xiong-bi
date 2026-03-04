const { getTestDb } = require('../setup');

describe.skip('Database Connection', () => {
  test('should connect to test database', async () => {
    const db = getTestDb();
    expect(db).toBeDefined();
    
    const connection = await db.getConnection();
    expect(connection).toBeDefined();
    
    const [rows] = await connection.execute('SELECT 1 as test');
    expect(rows[0].test).toBe(1);
    
    connection.release();
  });

  test('should have required tables', async () => {
    const db = getTestDb();
    const connection = await db.getConnection();
    
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'users'"
    );
    expect(tables.length).toBeGreaterThan(0);
    
    connection.release();
  });
});
