const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/database');
const jwt = require('jsonwebtoken');

describe('Announcement API - /api/announcements', () => {
  const adminToken = jwt.sign(
    { userId: 1, role: 'admin' },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  const studentToken = jwt.sign(
    { userId: 2, role: 'student' },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  const testAnnouncement = {
    title: '测试公告标题',
    content: '测试公告内容'
  };

  // Cleanup test data
  afterAll(async () => {
    try {
      await pool.execute('DELETE FROM announcements WHERE title LIKE ?', ['测试%']);
    } catch (error) {
      // Ignore cleanup errors
    } finally {
      // Close pool connection
      await pool.end();
    }
  });

  describe('GET /api/announcements - Public access', () => {
    test('should get announcements list successfully (public)', async () => {
      const response = await request(app)
        .get('/api/announcements');

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('获取成功');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Authentication & Authorization', () => {
    test('should return 401 without token for POST /admin', async () => {
      const response = await request(app)
        .post('/api/announcements/admin')
        .send(testAnnouncement);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 403 for student role for POST /admin', async () => {
      const response = await request(app)
        .post('/api/announcements/admin')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(testAnnouncement);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    test('should return 401 without token for PUT /admin/:id', async () => {
      const response = await request(app)
        .put('/api/announcements/admin/1')
        .send({ title: '更新标题' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 403 for student role for PUT /admin/:id', async () => {
      const response = await request(app)
        .put('/api/announcements/admin/1')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: '更新标题' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    test('should return 401 without token for DELETE /admin/:id', async () => {
      const response = await request(app)
        .delete('/api/announcements/admin/1');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 403 for student role for DELETE /admin/:id', async () => {
      const response = await request(app)
        .delete('/api/announcements/admin/1')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('POST /api/announcements/admin - Create announcement', () => {
    test('should create announcement successfully', async () => {
      const response = await request(app)
        .post('/api/announcements/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testAnnouncement);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('发布成功');
      expect(response.body.data).toMatchObject({
        title: testAnnouncement.title,
        content: testAnnouncement.content
      });
      expect(response.body.data).toHaveProperty('announcementId');
    });

    test('should return 400 for missing title', async () => {
      const response = await request(app)
        .post('/api/announcements/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: '只有内容没有标题'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('标题和内容不能为空');
    });

    test('should return 400 for missing content', async () => {
      const response = await request(app)
        .post('/api/announcements/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '只有标题没有内容'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('标题和内容不能为空');
    });

    test('should return 400 for empty title', async () => {
      const response = await request(app)
        .post('/api/announcements/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '',
          content: '测试内容'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('标题和内容不能为空');
    });

    test('should return 400 for empty content', async () => {
      const response = await request(app)
        .post('/api/announcements/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '测试标题',
          content: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('标题和内容不能为空');
    });
  });

  describe('PUT /api/announcements/admin/:id - Update announcement', () => {
    let announcementId;

    beforeAll(async () => {
      // Create a test announcement
      const [result] = await pool.execute(
        `INSERT INTO announcements (title, content, publishedBy, createdAt) 
         VALUES (?, ?, ?, NOW())`,
        ['测试更新公告', '初始内容', 1]
      );
      announcementId = result.insertId;
    });

    test('should update announcement title successfully', async () => {
      const response = await request(app)
        .put(`/api/announcements/admin/${announcementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '更新后的标题' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('更新成功');
    });

    test('should update announcement content successfully', async () => {
      const response = await request(app)
        .put(`/api/announcements/admin/${announcementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: '更新后的内容' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('更新成功');
    });

    test('should update both title and content successfully', async () => {
      const response = await request(app)
        .put(`/api/announcements/admin/${announcementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '同时更新标题',
          content: '同时更新内容'
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('更新成功');
    });

    test('should return 404 for non-existent announcement', async () => {
      const response = await request(app)
        .put('/api/announcements/admin/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '不存在的公告' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('公告不存在');
    });

    test('should return 400 for no update fields', async () => {
      const response = await request(app)
        .put(`/api/announcements/admin/${announcementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('没有需要更新的字段');
    });

    test('should return 400 for empty title', async () => {
      const response = await request(app)
        .put(`/api/announcements/admin/${announcementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('标题不能为空');
    });

    test('should return 400 for empty content', async () => {
      const response = await request(app)
        .put(`/api/announcements/admin/${announcementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('内容不能为空');
    });
  });

  describe('DELETE /api/announcements/admin/:id - Delete announcement', () => {
    let deleteAnnouncementId;

    beforeEach(async () => {
      // Create a test announcement for deletion
      const [result] = await pool.execute(
        `INSERT INTO announcements (title, content, publishedBy, createdAt) 
         VALUES (?, ?, ?, NOW())`,
        ['测试删除公告', '待删除内容', 1]
      );
      deleteAnnouncementId = result.insertId;
    });

    afterEach(async () => {
      // Clean up test data
      try {
        await pool.execute('DELETE FROM announcements WHERE announcementId = ?', [deleteAnnouncementId]);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    test('should delete announcement successfully', async () => {
      const response = await request(app)
        .delete(`/api/announcements/admin/${deleteAnnouncementId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('删除成功');

      // Verify deletion
      const [result] = await pool.execute(
        'SELECT * FROM announcements WHERE announcementId = ?',
        [deleteAnnouncementId]
      );
      expect(result.length).toBe(0);
    });

    test('should return 404 for non-existent announcement', async () => {
      const response = await request(app)
        .delete('/api/announcements/admin/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('公告不存在');
    });
  });
});
