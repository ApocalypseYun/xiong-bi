const request = require('supertest');
const app = require('../../app');

describe('Simple Route Test', () => {
  test('should load routes without error', () => {
    expect(app).toBeDefined();
  });
});
