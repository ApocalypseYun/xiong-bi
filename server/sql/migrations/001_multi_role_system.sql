-- ============================================
-- Migration: 001_multi_role_system.sql
-- Description: 扩展用户角色系统，支持三角色体系
-- Date: 2026-03-04
-- ============================================

-- 1. 添加 email 字段
ALTER TABLE users 
ADD COLUMN email VARCHAR(100) NULL AFTER password;

-- 2. 修改 role 字段，扩展为三角色体系
-- 步骤1: 先添加新角色（保留admin）
ALTER TABLE users 
MODIFY COLUMN role ENUM('student', 'admin', 'repairman', 'super_admin') DEFAULT 'student';

-- 步骤2: 将现有 admin 角色升级为 super_admin
UPDATE users 
SET role = 'super_admin' 
WHERE role = 'admin';

-- 步骤3: 删除 admin 角色，仅保留三个新角色
ALTER TABLE users 
MODIFY COLUMN role ENUM('student', 'repairman', 'super_admin') DEFAULT 'student';

-- 4. 为 email 字段添加索引（可选，用于查询优化）
ALTER TABLE users 
ADD INDEX idx_email (email);

-- ============================================
-- 验证迁移结果
-- ============================================
-- 执行以下查询验证：
-- SELECT userId, username, role, email FROM users;
-- 应看到：admin 用户的 role 为 'super_admin'，所有用户都有 email 字段（NULL）
