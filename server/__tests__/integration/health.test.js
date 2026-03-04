const request = require('supertest');
const app = require('../../app');

describe('Health Check', () => {
  test('GET /health should return OK status', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
  });
});
