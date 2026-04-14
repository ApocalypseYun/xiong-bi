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

    // 查询评价（包含维修工反向评价）
    const [evaluations] = await pool.execute(
      `SELECT evaluationId, rating, comment, repairmanRating, repairmanComment, repairmanEvaluatedAt, createdAt
       FROM evaluations WHERE orderId = ?`,
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

// 催促订单（学生操作，订单超过6小时未接单）
const urgeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) return error(res, '无效的订单ID', 400);
    const userId = req.user.userId;
    const [orders] = await pool.execute(
      'SELECT orderId, userId, status, createdAt, lastUrgedAt FROM repairOrders WHERE orderId = ?', [orderId]
    );
    if (orders.length === 0) return error(res, '订单不存在', 404);
    const order = orders[0];
    if (order.userId !== userId) return error(res, '无权操作此订单', 403);
    if (order.status !== 'pending') return error(res, '只能催促待接单的订单', 400);

    const now = new Date();
    const createdAt = new Date(order.createdAt);
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreation < 6) {
      const remainHours = (6 - hoursSinceCreation).toFixed(1);
      return error(res, `暂不可催促，请于 ${remainHours} 小时后再尝试`, 400);
    }

    await pool.execute(
      'UPDATE repairOrders SET lastUrgedAt = NOW(), urgeCount = urgeCount + 1 WHERE orderId = ?',
      [orderId]
    );
    return success(res, null, '催促成功，管理员将尽快处理');
  } catch (err) {
    console.error('催促订单错误:', err);
    return error(res, '催促失败', 500);
  }
};

// 撤回订单（只能撤回 pending 状态的自己的订单）
const withdrawOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) return error(res, '无效的订单ID', 400);
    const userId = req.user.userId;
    const [orders] = await pool.execute(
      'SELECT orderId, userId, status FROM repairOrders WHERE orderId = ?', [orderId]
    );
    if (orders.length === 0) return error(res, '订单不存在', 404);
    if (orders[0].userId !== userId) return error(res, '无权操作此订单', 403);
    if (orders[0].status !== 'pending') return error(res, '只能撤回待接单的订单', 400);
    await pool.execute('UPDATE repairOrders SET status = ? WHERE orderId = ?', ['withdrawn', orderId]);
    return success(res, null, '订单已撤回');
  } catch (err) {
    console.error('撤回订单错误:', err);
    return error(res, '撤回失败', 500);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  urgeOrder,
  withdrawOrder
};
