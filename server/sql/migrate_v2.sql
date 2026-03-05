-- server/sql/migrate_v2.sql
-- 宿舍报修系统 v2 数据库迁移

-- 1. 新增住户预置表
CREATE TABLE IF NOT EXISTS residents (
  residentId   INT PRIMARY KEY AUTO_INCREMENT,
  studentId    VARCHAR(50) UNIQUE NOT NULL,
  name         VARCHAR(50) NOT NULL,
  phone        VARCHAR(20) NOT NULL,
  building     VARCHAR(50) NOT NULL,
  roomNumber   VARCHAR(50) NOT NULL,
  qqEmail      VARCHAR(100) NOT NULL,
  isRegistered BOOLEAN DEFAULT FALSE,
  createdAt    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. users 表 ENUM 增加 repairman
-- Migrate existing 'admin' role rows to 'super_admin' before changing ENUM
UPDATE users SET role = 'super_admin' WHERE role = 'admin';
ALTER TABLE users MODIFY COLUMN role ENUM('student', 'repairman', 'super_admin') DEFAULT 'student';

-- 3. repairOrders 新增字段
ALTER TABLE repairOrders MODIFY COLUMN status ENUM('pending', 'processing', 'completed', 'withdrawn') DEFAULT 'pending';
ALTER TABLE repairOrders ADD COLUMN IF NOT EXISTS repairmanId INT NULL;
ALTER TABLE repairOrders ADD COLUMN IF NOT EXISTS lastUrgedAt DATETIME NULL;
ALTER TABLE repairOrders ADD COLUMN IF NOT EXISTS urgeCount INT NOT NULL DEFAULT 0;

-- Add FK conditionally (safe to re-run)
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'repairOrders'
    AND CONSTRAINT_NAME = 'fk_repairmanId'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE repairOrders ADD CONSTRAINT fk_repairmanId FOREIGN KEY (repairmanId) REFERENCES users(userId)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index on repairmanId for repairman query performance
CREATE INDEX IF NOT EXISTS idx_repairmanId ON repairOrders (repairmanId);

-- 4. evaluations 新增双向评价字段
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS repairmanRating INT NULL CHECK (repairmanRating BETWEEN 1 AND 5);
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS repairmanComment TEXT NULL;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS repairmanEvaluatedAt DATETIME NULL;

-- 5. 测试住户数据
INSERT IGNORE INTO residents (studentId, name, phone, building, roomNumber, qqEmail)
VALUES ('2024001', '张三', '13800000000', 'A栋', '101', '123456789@qq.com');
