// Mock database connection for middleware tests that don't need DB
jest.mock('../../config/database', () => ({
  execute: jest.fn(),
  query: jest.fn()
}));

const { authorize, authenticate } = require('../../middleware/auth');

describe('Auth Middleware - authorize', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('Role validation', () => {
    test('should allow student role', () => {
      req.user.role = 'student';
      const middleware = authorize(['student']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow repairman role', () => {
      req.user.role = 'repairman';
      const middleware = authorize(['repairman']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow super_admin role', () => {
      req.user.role = 'super_admin';
      const middleware = authorize(['super_admin']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow multiple roles', () => {
      req.user.role = 'repairman';
      const middleware = authorize(['student', 'repairman', 'super_admin']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Permission denied', () => {
    test('should deny student accessing admin endpoint', () => {
      req.user.role = 'student';
      const middleware = authorize(['super_admin']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        code: 403,
        message: 'Insufficient permissions'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should deny repairman accessing super_admin endpoint', () => {
      req.user.role = 'repairman';
      const middleware = authorize(['super_admin']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Backward compatibility', () => {
    test('should work with single role array', () => {
      req.user.role = 'student';
      const middleware = authorize(['student']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should work with multiple roles array', () => {
      req.user.role = 'repairman';
      const middleware = authorize(['student', 'repairman']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    test('should handle empty roles array', () => {
      req.user.role = 'student';
      const middleware = authorize([]);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle undefined user role', () => {
      req.user.role = undefined;
      const middleware = authorize(['student']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
describe('Auth Middleware - authenticate', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('should call next with valid token', () => {
    const validToken = require('jsonwebtoken').sign(
      { id: 1, role: 'student' },
      process.env.JWT_SECRET || 'your-secret-key'
    );
    req.headers.authorization = `Bearer ${validToken}`;
    
    authenticate(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.role).toBe('student');
  });

  test('should return 401 without token', () => {
    authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: 'Token required'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 with invalid token', () => {
    req.headers.authorization = 'Bearer invalid-token';
    
    authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: 'Invalid token'
    });
    expect(next).not.toHaveBeenCalled();
  });
});
