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

// 获取待处理订单（包括 pending 和 processing）
const getPendingOrders = async (req, res) => {
  try {
    const [orders] = await pool.execute(`
      SELECT 
        o.orderId, o.userId, o.repairType, o.building, o.roomNumber, 
        o.contactPhone, o.description, o.status, o.adminId, o.createdAt,
        u.username, u.realName as userRealName
      FROM repairOrders o
      LEFT JOIN users u ON o.userId = u.userId
      WHERE o.status IN ('pending', 'processing')
      ORDER BY 
        CASE o.status 
          WHEN 'pending' THEN 1 
          WHEN 'processing' THEN 2 
        END,
        o.createdAt ASC
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

// 获取被催促的订单（超管首页提示用）
const getUrgedOrders = async (req, res) => {
  try {
    const [orders] = await pool.execute(`
      SELECT o.orderId, o.repairType, o.building, o.roomNumber, o.createdAt,
             o.urgeCount, o.lastUrgedAt, u.realName as userRealName
      FROM repairOrders o
      LEFT JOIN users u ON o.userId = u.userId
      WHERE o.status = 'pending' AND o.urgeCount > 0
      ORDER BY o.lastUrgedAt DESC
    `);
    return success(res, orders, '获取催促订单成功');
  } catch (err) {
    console.error('获取催促订单错误:', err);
    return error(res, '获取催促订单失败', 500);
  }
};

module.exports = {
  getAllOrders,
  getPendingOrders,
  getUrgedOrders
};
