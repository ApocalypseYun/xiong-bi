-- ============================================
-- Migration: 002_residents_table.sql
-- Description: 创建住户验证表，用于注册时验证学生身份
-- Date: 2026-03-04
-- ============================================

-- 1. 创建 residents 表
CREATE TABLE residents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id VARCHAR(50) UNIQUE NOT NULL COMMENT '学号',
  name VARCHAR(50) NOT NULL COMMENT '姓名',
  phone VARCHAR(20) NOT NULL COMMENT '联系电话',
  building VARCHAR(50) NOT NULL COMMENT '楼栋',
  room_number VARCHAR(50) NOT NULL COMMENT '寝室号',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='住户验证表';

-- 2. 创建索引
-- 单列索引：用于快速查找学生
CREATE INDEX idx_student ON residents(student_id);

-- 复合索引：用于按楼栋和寝室号查询
CREATE INDEX idx_room ON residents(building, room_number);

-- ============================================
-- 使用说明
-- ============================================
-- 此表用于注册验证，独立于 users 表
-- 学生注册时需要匹配 5 个验证字段：
--   1. student_id (学号)
--   2. name (姓名)
--   3. phone (电话)
--   4. building (楼栋)
--   5. room_number (寝室号)
-- 
-- 数据导入方式：
--   - 通过 Excel 批量导入（由 super_admin 执行）
--   - 导入前需验证数据格式
--   - 导入时处理重复学号（更新或跳过）
--
-- 示例数据：
-- INSERT INTO residents (student_id, name, phone, building, room_number)
-- VALUES ('2024001', '张三', '13800138001', 'A栋', '101');
-- ============================================

-- ============================================
-- 验证迁移结果
-- ============================================
-- 执行以下查询验证：
-- DESCRIBE residents;
-- SHOW INDEX FROM residents;
-- 应看到：
--   - 6个字段（id, student_id, name, phone, building, room_number, created_at）
--   - student_id 为 UNIQUE
--   - idx_student 索引（student_id）
--   - idx_room 复合索引（building, room_number）
