const pool = require('../config/database');
const { success, error } = require('../utils/response');

// 获取所有待接单订单
const getPendingOrders = async (req, res) => {
  try {
    const [orders] = await pool.execute(`
      SELECT o.orderId, o.repairType, o.building, o.roomNumber, o.contactPhone,
             o.description, o.status, o.createdAt, o.urgeCount, o.lastUrgedAt,
             u.realName as userRealName
      FROM repairOrders o
      LEFT JOIN users u ON o.userId = u.userId
      WHERE o.status = 'pending'
      ORDER BY o.urgeCount DESC, o.createdAt ASC
    `);
    for (const order of orders) {
      const [images] = await pool.execute('SELECT imageUrl FROM orderImages WHERE orderId = ?', [order.orderId]);
      order.images = images;
    }
    return success(res, orders, '获取待接单列表成功');
  } catch (err) {
    console.error('获取待接单错误:', err);
    return error(res, '获取待接单列表失败', 500);
  }
};

// 获取我的订单（进行中+已完成）
const getMyOrders = async (req, res) => {
  try {
    const repairmanId = req.user.userId;
    const [orders] = await pool.execute(`
      SELECT o.orderId, o.repairType, o.building, o.roomNumber, o.contactPhone,
             o.description, o.status, o.createdAt,
             u.realName as userRealName
      FROM repairOrders o
      LEFT JOIN users u ON o.userId = u.userId
      WHERE o.repairmanId = ? AND o.status IN ('processing', 'completed')
      ORDER BY o.createdAt DESC
    `, [repairmanId]);
    for (const order of orders) {
      const [images] = await pool.execute('SELECT imageUrl FROM orderImages WHERE orderId = ?', [order.orderId]);
      order.images = images;
      if (order.status === 'completed') {
        const [ci] = await pool.execute('SELECT imageUrl FROM completionImages WHERE orderId = ?', [order.orderId]);
        order.completionImages = ci;
      }
    }
    return success(res, orders, '获取我的订单成功');
  } catch (err) {
    console.error('获取我的订单错误:', err);
    return error(res, '获取我的订单失败', 500);
  }
};

// 接单
const acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) return error(res, '无效的订单ID', 400);
    const repairmanId = req.user.userId;

    // Check order exists first
    const [orders] = await pool.execute('SELECT orderId FROM repairOrders WHERE orderId = ?', [orderId]);
    if (orders.length === 0) return error(res, '订单不存在', 404);

    // Atomic update - only succeeds if status is still 'pending'
    const [result] = await pool.execute(
      "UPDATE repairOrders SET status = 'processing', repairmanId = ? WHERE orderId = ? AND status = 'pending'",
      [repairmanId, orderId]
    );
    if (result.affectedRows === 0) {
      return error(res, '该订单已被接单或已完成', 400);
    }

    return success(res, { orderId, status: 'processing' }, '接单成功');
  } catch (err) {
    console.error('接单错误:', err);
    return error(res, '接单失败', 500);
  }
};

// 完成订单
const completeOrder = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      connection.release();
      return error(res, '无效的订单ID', 400);
    }
    const { completionImageUrls } = req.body;
    const repairmanId = req.user.userId;
    if (!completionImageUrls || !Array.isArray(completionImageUrls) || completionImageUrls.length === 0) {
      connection.release();
      return error(res, '请上传完成凭证图片', 400);
    }

    await connection.beginTransaction();

    const [orders] = await connection.execute(
      'SELECT orderId, status, repairmanId FROM repairOrders WHERE orderId = ? FOR UPDATE', [orderId]
    );
    if (orders.length === 0) {
      await connection.rollback();
      return error(res, '订单不存在', 404);
    }
    if (orders[0].status !== 'processing') {
      await connection.rollback();
      return error(res, '只能完成进行中的订单', 400);
    }
    if (orders[0].repairmanId !== repairmanId) {
      await connection.rollback();
      return error(res, '只能完成自己接单的订单', 403);
    }

    await connection.execute(
      'UPDATE repairOrders SET status = ?, completedAt = NOW() WHERE orderId = ?',
      ['completed', orderId]
    );
    for (const imageUrl of completionImageUrls) {
      await connection.execute(
        'INSERT INTO completionImages (orderId, imageUrl, uploadedBy) VALUES (?, ?, ?)',
        [orderId, imageUrl, repairmanId]
      );
    }
    await connection.commit();
    return success(res, { orderId, status: 'completed' }, '完成报修');
  } catch (err) {
    await connection.rollback();
    console.error('完成订单错误:', err);
    return error(res, '完成订单失败', 500);
  } finally {
    connection.release();
  }
};

// 维修工对用户进行反向评价
const evaluateUser = async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderIdNum = parseInt(orderId, 10);
    if (isNaN(orderIdNum)) return error(res, '无效的订单ID', 400);
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return error(res, '评分必须在1-5之间', 400);
    const repairmanId = req.user.userId;

    const [orders] = await pool.execute(
      'SELECT orderId, status, repairmanId FROM repairOrders WHERE orderId = ?', [orderIdNum]
    );
    if (orders.length === 0) return error(res, '订单不存在', 404);
    if (orders[0].status !== 'completed') return error(res, '只能评价已完成的订单', 400);
    if (orders[0].repairmanId !== repairmanId) return error(res, '只能评价自己处理的订单', 403);

    const [evals] = await pool.execute(
      'SELECT evaluationId, repairmanEvaluatedAt FROM evaluations WHERE orderId = ?', [orderIdNum]
    );
    if (evals.length === 0) return error(res, '用户尚未评价，暂不可进行反向评价', 400);
    if (evals[0].repairmanEvaluatedAt) return error(res, '已评价过', 400);

    await pool.execute(
      'UPDATE evaluations SET repairmanRating=?, repairmanComment=?, repairmanEvaluatedAt=NOW() WHERE orderId=?',
      [parseInt(rating), comment || null, orderIdNum]
    );
    return success(res, null, '评价成功');
  } catch (err) {
    console.error('反向评价错误:', err);
    return error(res, '评价失败', 500);
  }
};

module.exports = { getPendingOrders, getMyOrders, acceptOrder, completeOrder, evaluateUser };
