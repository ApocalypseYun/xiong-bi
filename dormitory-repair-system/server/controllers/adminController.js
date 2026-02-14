const pool = require('../config/database');
const { success, error } = require('../utils/response');

// 获取所有订单（支持日期筛选）
const getAllOrders = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let sql = `
      SELECT 
        o.orderId, o.userId, o.repairType, o.building, o.roomNumber, 
        o.contactPhone, o.description, o.status, o.adminId, 
        o.completedAt, o.createdAt, o.updatedAt,
        u.username, u.realName as userRealName
      FROM repairOrders o
      LEFT JOIN users u ON o.userId = u.userId
      WHERE 1=1
    `;
    const params = [];

    // 日期筛选
    if (startDate) {
      sql += ' AND o.createdAt >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND o.createdAt <= ?';
      params.push(endDate + ' 23:59:59');
    }

    sql += ' ORDER BY o.createdAt DESC';

    const [orders] = await pool.execute(sql, params);

    // 获取每个订单的图片
    for (const order of orders) {
      const [images] = await pool.execute(
        'SELECT imageId, imageUrl FROM orderImages WHERE orderId = ?',
        [order.orderId]
      );
      order.images = images;

      // 如果已完成，获取完成凭证图片
      if (order.status === 'completed') {
        const [completionImages] = await pool.execute(
          'SELECT imageId, imageUrl FROM completionImages WHERE orderId = ?',
          [order.orderId]
        );
        order.completionImages = completionImages;
      }
    }

    return success(res, orders, '获取订单列表成功');
  } catch (err) {
    console.error('获取订单列表错误:', err);
    return error(res, '获取订单列表失败', 500);
  }
};

// 获取待处理订单
const getPendingOrders = async (req, res) => {
  try {
    const [orders] = await pool.execute(`
      SELECT 
        o.orderId, o.userId, o.repairType, o.building, o.roomNumber, 
        o.contactPhone, o.description, o.status, o.createdAt,
        u.username, u.realName as userRealName
      FROM repairOrders o
      LEFT JOIN users u ON o.userId = u.userId
      WHERE o.status = 'pending'
      ORDER BY o.createdAt ASC
    `);

    // 获取每个订单的图片
    for (const order of orders) {
      const [images] = await pool.execute(
        'SELECT imageId, imageUrl FROM orderImages WHERE orderId = ?',
        [order.orderId]
      );
      order.images = images;
    }

    return success(res, orders, '获取待处理订单成功');
  } catch (err) {
    console.error('获取待处理订单错误:', err);
    return error(res, '获取待处理订单失败', 500);
  }
};

// 接单
const acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    // 检查订单是否存在且状态为pending
    const [orders] = await pool.execute(
      'SELECT orderId, status FROM repairOrders WHERE orderId = ?',
      [id]
    );

    if (orders.length === 0) {
      return error(res, '订单不存在', 404);
    }

    if (orders[0].status !== 'pending') {
      return error(res, '该订单已被处理或已完成', 400);
    }

    // 更新订单状态为processing，并记录adminId
    await pool.execute(
      'UPDATE repairOrders SET status = ?, adminId = ? WHERE orderId = ?',
      ['processing', adminId, id]
    );

    return success(res, { orderId: parseInt(id), status: 'processing' }, '接单成功');
  } catch (err) {
    console.error('接单错误:', err);
    return error(res, '接单失败', 500);
  }
};

// 完成订单（上传凭证）
const completeOrder = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { completionImageUrls } = req.body;
    const adminId = req.user.userId;

    // 验证凭证图片
    if (!completionImageUrls || !Array.isArray(completionImageUrls) || completionImageUrls.length === 0) {
      return error(res, '请上传完成凭证图片', 400);
    }

    // 检查订单是否存在且状态为processing
    const [orders] = await connection.execute(
      'SELECT orderId, status, adminId FROM repairOrders WHERE orderId = ?',
      [id]
    );

    if (orders.length === 0) {
      return error(res, '订单不存在', 404);
    }

    const order = orders[0];
    
    if (order.status !== 'processing') {
      if (order.status === 'pending') {
        return error(res, '请先接单再完成', 400);
      }
      return error(res, '该订单已完成', 400);
    }

    // 开始事务
    await connection.beginTransaction();

    // 更新订单状态为completed
    await connection.execute(
      'UPDATE repairOrders SET status = ?, completedAt = NOW() WHERE orderId = ?',
      ['completed', id]
    );

    // 插入完成凭证图片
    for (const imageUrl of completionImageUrls) {
      await connection.execute(
        'INSERT INTO completionImages (orderId, imageUrl, uploadedBy) VALUES (?, ?, ?)',
        [id, imageUrl, adminId]
      );
    }

    // 提交事务
    await connection.commit();

    return success(res, { orderId: parseInt(id), status: 'completed' }, '完成报修');
  } catch (err) {
    // 回滚事务
    await connection.rollback();
    console.error('完成订单错误:', err);
    return error(res, '完成订单失败', 500);
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllOrders,
  getPendingOrders,
  acceptOrder,
  completeOrder
};
