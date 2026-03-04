-- ============================================
-- Migration: 003_order_enhancements.sql
-- Description: 订单增强 - 催单/撤单功能、双向评价支持
-- Date: 2026-03-04
-- ============================================

-- ============================================
-- Part 1: repairOrders 表增强
-- ============================================

-- 1.1 添加催单相关字段
ALTER TABLE repairOrders 
ADD COLUMN is_urge BOOLEAN DEFAULT FALSE COMMENT '是否已催单' AFTER status,
ADD COLUMN urge_time DATETIME NULL COMMENT '最后催单时间' AFTER is_urge;

-- 1.2 添加撤单状态支持
-- MySQL 修改 ENUM 需要重新定义整个 ENUM
ALTER TABLE repairOrders 
MODIFY COLUMN status ENUM('pending', 'processing', 'completed', 'withdrawn') DEFAULT 'pending' 
COMMENT '订单状态: pending-待处理, processing-处理中, completed-已完成, withdrawn-已撤单';

-- 1.3 添加催单索引（用于查询待催单订单）
ALTER TABLE repairOrders 
ADD INDEX idx_urge (is_urge, urge_time);

-- ============================================
-- Part 2: evaluations 表增强
-- ============================================

-- 2.1 添加修理工评价字段（双向评价支持）
ALTER TABLE evaluations 
ADD COLUMN repairman_rating TINYINT NULL COMMENT '修理工对住户的评价(1-5)' AFTER comment,
ADD COLUMN repairman_comment TEXT NULL COMMENT '修理工评价内容' AFTER repairman_rating,
ADD COLUMN repairman_evaluated_at DATETIME NULL COMMENT '修理工评价时间' AFTER repairman_comment;

-- 2.2 添加 CHECK 约束确保评分在有效范围内
-- 注意：MySQL 在 ALTER TABLE 中添加 CHECK 约束的语法
ALTER TABLE evaluations 
ADD CONSTRAINT chk_repairman_rating CHECK (repairman_rating IS NULL OR (repairman_rating BETWEEN 1 AND 5));

-- ============================================
-- Part 3: 业务约束说明
-- ============================================

/*
催单规则：
- 订单创建 6 小时后可催单
- 每单最多催 3 次
- 催单间隔 >= 6 小时

撤单约束：
- 仅 pending 状态可撤单
- processing/completed 状态不可撤单

评价窗口：
- 住户评价：订单完成后 7 天内
- 修理工评价：住户评价后 7 天内
*/

-- ============================================
-- 验证迁移结果
-- ============================================
-- 执行以下查询验证：
/*
-- 验证 repairOrders 新字段
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'repairOrders' 
  AND COLUMN_NAME IN ('is_urge', 'urge_time');

-- 验证 status ENUM 包含 withdrawn
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'repairOrders' 
  AND COLUMN_NAME = 'status';

-- 验证 evaluations 新字段
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'evaluations' 
  AND COLUMN_NAME IN ('repairman_rating', 'repairman_comment', 'repairman_evaluated_at');

-- 验证索引
SHOW INDEX FROM repairOrders WHERE Key_name = 'idx_urge';
*/
