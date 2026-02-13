const pool = require('../config/database');
const { success, error } = require('../utils/response');

// 创建评价
const createEvaluation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderId, rating, content } = req.body;

    // 验证必填字段
    if (!orderId || !rating) {
      return error(res, '订单ID和评分不能为空', 400);
    }

    // 验证评分范围
    if (rating < 1 || rating > 5) {
      return error(res, '评分必须在1-5之间', 400);
    }

    // 检查订单是否存在且属于当前用户
    const [orders] = await pool.execute(
      `SELECT orderId, status, userId FROM repairOrders WHERE orderId = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return error(res, '订单不存在', 404);
    }

    const order = orders[0];

    // 验证订单归属
    if (order.userId !== userId) {
      return error(res, '无权评价该订单', 403);
    }

    // 验证订单状态必须为已完成
    if (order.status !== 'completed') {
      return error(res, '只能评价已完成的订单', 400);
    }

    // 检查是否已评价
    const [existingEvaluations] = await pool.execute(
      `SELECT evaluationId FROM evaluations WHERE orderId = ?`,
      [orderId]
    );

    if (existingEvaluations.length > 0) {
      return error(res, '该订单已评价，不能重复评价', 400);
    }

    // 创建评价
    const [result] = await pool.execute(
      `INSERT INTO evaluations (orderId, userId, rating, content, createdAt) 
       VALUES (?, ?, ?, ?, NOW())`,
      [orderId, userId, rating, content || null]
    );

    return success(res, {
      evaluationId: result.insertId,
      orderId,
      rating,
      content
    }, '评价成功');
  } catch (err) {
    console.error('创建评价错误:', err);
    return error(res, '创建评价失败', 500);
  }
};

// 获取我的评价列表（学生）
const getMyEvaluations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [evaluations] = await pool.execute(
      `SELECT e.evaluationId, e.orderId, e.rating, e.content, e.createdAt,
              o.description as orderDescription
       FROM evaluations e
       LEFT JOIN orders o ON e.orderId = o.orderId
       WHERE e.userId = ?
       ORDER BY e.createdAt DESC`,
      [userId]
    );

    return success(res, evaluations, '获取成功');
  } catch (err) {
    console.error('获取评价列表错误:', err);
    return error(res, '获取评价列表失败', 500);
  }
};

// 获取所有评价（管理员）
const getAllEvaluations = async (req, res) => {
  try {
    const [evaluations] = await pool.execute(
      `SELECT e.evaluationId, e.orderId, e.rating, e.content, e.createdAt,
              u.username, u.realName,
              o.description as orderDescription
       FROM evaluations e
       LEFT JOIN users u ON e.userId = u.userId
       LEFT JOIN orders o ON e.orderId = o.orderId
       ORDER BY e.createdAt DESC`
    );

    return success(res, evaluations, '获取成功');
  } catch (err) {
    console.error('获取所有评价错误:', err);
    return error(res, '获取所有评价失败', 500);
  }
};

module.exports = {
  createEvaluation,
  getMyEvaluations,
  getAllEvaluations
};
