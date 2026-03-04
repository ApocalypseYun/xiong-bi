const pool = require('../config/database');
const { success, error } = require('../utils/response');

// 创建报修单
const createOrder = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.userId;
    const { repairType, building, roomNumber, contactPhone, description, imageUrls } = req.body;

    // 验证必填字段
    if (!repairType || !building || !roomNumber || !contactPhone || !description) {
      return error(res, '报修类型、楼栋、房间号、联系电话和问题描述为必填项', 400);
    }

    // 验证联系电话格式
    if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
      return error(res, '联系电话格式不正确', 400);
    }

    await connection.beginTransaction();

    // 插入报修订单
    const [orderResult] = await connection.execute(
      `INSERT INTO repairOrders (userId, repairType, building, roomNumber, contactPhone, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, repairType, building, roomNumber, contactPhone, description]
    );

    const orderId = orderResult.insertId;

    // 插入订单图片（如果有）
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      const imageValues = imageUrls.map(url => [orderId, url]);
      await connection.query(
        'INSERT INTO orderImages (orderId, imageUrl) VALUES ?',
        [imageValues]
      );
    }

    await connection.commit();

    // 返回创建的订单信息
    const [orders] = await pool.execute(
      `SELECT orderId, userId, repairType, building, roomNumber, contactPhone, description, status, createdAt
       FROM repairOrders WHERE orderId = ?`,
      [orderId]
    );

    return success(res, orders[0], '报修成功');
  } catch (err) {
    await connection.rollback();
    console.error('创建报修单错误:', err);
    return error(res, '创建报修单失败，请稍后重试', 500);
  } finally {
    connection.release();
  }
};

// 获取我的报修列表
const getOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;

    // 验证状态参数
    const validStatuses = ['pending', 'processing', 'completed'];
    let statusCondition = '';
    const params = [userId];

    if (status) {
      if (!validStatuses.includes(status)) {
        return error(res, '无效的状态参数', 400);
      }
      statusCondition = 'AND status = ?';
      params.push(status);
    }

    const [orders] = await pool.execute(
      `SELECT orderId, repairType, building, roomNumber, status, createdAt, completedAt
       FROM repairOrders 
       WHERE userId = ? ${statusCondition}
       ORDER BY createdAt DESC`,
      params
    );

    return success(res, orders, '获取成功');
  } catch (err) {
    console.error('获取报修列表错误:', err);
    return error(res, '获取报修列表失败', 500);
  }
};

// 获取报修详情
const getOrderById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // 查询订单（确保是当前用户的订单）
    const [orders] = await pool.execute(
      `SELECT orderId, userId, repairType, building, roomNumber, contactPhone, description, status, adminId, createdAt, completedAt
       FROM repairOrders 
       WHERE orderId = ? AND userId = ?`,
      [id, userId]
    );

    if (orders.length === 0) {
      return error(res, '报修单不存在或无权访问', 404);
    }

    const order = orders[0];

    // 查询订单图片
    const [images] = await pool.execute(
      'SELECT imageId, imageUrl, createdAt FROM orderImages WHERE orderId = ?',
      [id]
    );

    // 查询完成凭证图片
    const [completionImages] = await pool.execute(
      'SELECT imageId, imageUrl, createdAt FROM completionImages WHERE orderId = ?',
      [id]
    );

    // 查询评价
    const [evaluations] = await pool.execute(
      'SELECT evaluationId, rating, comment, createdAt FROM evaluations WHERE orderId = ?',
      [id]
    );

    const result = {
      ...order,
      images,
      completionImages,
      evaluation: evaluations.length > 0 ? evaluations[0] : null
    };

    return success(res, result, '获取成功');
  } catch (err) {
    console.error('获取报修详情错误:', err);
    return error(res, '获取报修详情失败', 500);
  }
};

// 催单
const urgeOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // 查询订单（确保是当前用户的订单）
    const [orders] = await pool.execute(
      `SELECT orderId, userId, status, is_urge, createdAt
       FROM repairOrders 
       WHERE orderId = ?`,
      [id]
    );

    if (orders.length === 0 || orders[0].userId !== userId) {
      return error(res, '报修单不存在或无权访问', 404);
    }

    const order = orders[0];

    // 验证订单状态
    if (order.status !== 'pending') {
      return error(res, '只能催单待处理状态的订单', 400);
    }

    // 验证是否已催单
    if (order.is_urge) {
      return error(res, '该订单已催单，请勿重复操作', 400);
    }

    // 验证时间是否超过6小时
    const createdAt = new Date(order.createdAt);
    const now = new Date();
    const hoursDiff = (now - createdAt) / (1000 * 60 * 60);

    if (hoursDiff < 6) {
      return error(res, '订单创建不足6小时，暂时无法催单', 400);
    }

    // 更新催单状态
    await pool.execute(
      `UPDATE repairOrders 
       SET is_urge = TRUE, urge_time = NOW()
       WHERE orderId = ?`,
      [id]
    );

    // 返回更新后的订单信息
    const [updatedOrders] = await pool.execute(
      `SELECT orderId, is_urge, urge_time
       FROM repairOrders 
       WHERE orderId = ?`,
      [id]
    );

    return success(res, updatedOrders[0], '催单成功');
  } catch (err) {
    console.error('催单错误:', err);
    return error(res, '催单失败，请稍后重试', 500);
  }
};

// 撤回报修单
const withdrawOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // 查询订单
    const [orders] = await pool.execute(
      'SELECT orderId, userId, status FROM repairOrders WHERE orderId = ?',
      [id]
    );

    // 验证订单是否存在
    if (orders.length === 0) {
      return error(res, '订单不存在', 404);
    }

    const order = orders[0];

    // 验证订单所有者
    if (order.userId !== userId) {
      return error(res, '无权撤回此订单', 403);
    }

    // 验证订单状态
    if (order.status !== 'pending') {
      return error(res, '只能撤回待处理的订单', 400);
    }

    // 更新订单状态为 withdrawn
    await pool.execute(
      'UPDATE repairOrders SET status = ? WHERE orderId = ?',
      ['withdrawn', id]
    );

    return success(res, null, '撤单成功');
  } catch (err) {
    console.error('撤回报修单错误:', err);
    return error(res, '撤单失败，请稍后重试', 500);
  }
};


// 维修工评价住户
const repairmanEvaluate = async (req, res) => {
  try {
    const repairmanId = req.user.userId;
    const repairmanRole = req.user.role;
    const { id } = req.params;
    const { rating, comment } = req.body;

    // 权限验证：只有维修工和超级管理员可以评价
    if (!['repairman', 'super_admin'].includes(repairmanRole)) {
      return error(res, '无权限', 403);
    }

    // 验证必填字段
    if (rating === null || rating === undefined) {
      return error(res, '评分不能为空', 400);
    }

    // 验证评分范围
    if (rating < 1 || rating > 5) {
      return error(res, '评分必须在1-5之间', 400);
    }

    // 查询订单
    const [orders] = await pool.execute(
      `SELECT orderId, status, adminId FROM repairOrders WHERE orderId = ?`,
      [id]
    );

    if (orders.length === 0) {
      return error(res, '订单不存在', 404);
    }

    const order = orders[0];

    // 验证订单状态必须为已完成
    if (order.status !== 'completed') {
      return error(res, '只能评价已完成的订单', 400);
    }

    // 验证维修工权限：必须是该订单的维修工（adminId）
    if (order.adminId !== repairmanId) {
      return error(res, '无权评价该订单', 403);
    }

    // 查询评价记录
    const [evaluations] = await pool.execute(
      `SELECT evaluationId, rating, createdAt, repairman_rating FROM evaluations WHERE orderId = ?`,
      [id]
    );

    // 验证住户已评价
    if (evaluations.length === 0 || !evaluations[0].rating) {
      return error(res, '住户尚未评价，请等待住户评价后再评价', 400);
    }

    const evaluation = evaluations[0];

    // 验证维修工未重复评价
    if (evaluation.repairman_rating) {
      return error(res, '该订单已评价，不能重复评价', 400);
    }

    // 验证7天窗口（基于住户评价时间）
    const evaluationTime = new Date(evaluation.createdAt);
    const now = new Date();
    const daysDiff = (now - evaluationTime) / (1000 * 60 * 60 * 24);
    if (daysDiff > 7) {
      return error(res, '评价时间已超过7天，无法评价', 400);
    }

    // 更新评价记录
    await pool.execute(
      `UPDATE evaluations 
       SET repairman_rating = ?, repairman_comment = ?, repairman_evaluated_at = NOW()
       WHERE orderId = ?`,
      [rating, comment || null, id]
    );

    return success(res, {
      orderId: parseInt(id),
      rating,
      comment
    }, '评价成功');
  } catch (err) {
    console.error('维修工评价错误:', err);
    return error(res, '评价失败', 500);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  urgeOrder,
  withdrawOrder,
  repairmanEvaluate
};
