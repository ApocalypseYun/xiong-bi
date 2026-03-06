-- server/sql/migrate_v2_fixed.sql
-- 宿舍报修系统 v2 数据库迁移（兼容 MySQL 8+/9+）

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

-- 2. users 表：先把旧 'admin' 改为 'super_admin'，再修改 ENUM
UPDATE users SET role = 'super_admin' WHERE role = 'admin';
ALTER TABLE users MODIFY COLUMN role ENUM('student', 'repairman', 'super_admin') DEFAULT 'student';

-- 3. repairOrders：修改 status ENUM
ALTER TABLE repairOrders MODIFY COLUMN status ENUM('pending', 'processing', 'completed', 'withdrawn') DEFAULT 'pending';

-- 4. repairOrders：条件添加列（用存储过程绕过 IF NOT EXISTS 限制）
DROP PROCEDURE IF EXISTS add_column_if_missing;
DELIMITER $$
CREATE PROCEDURE add_column_if_missing()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repairOrders' AND COLUMN_NAME = 'repairmanId'
  ) THEN
    ALTER TABLE repairOrders ADD COLUMN repairmanId INT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repairOrders' AND COLUMN_NAME = 'lastUrgedAt'
  ) THEN
    ALTER TABLE repairOrders ADD COLUMN lastUrgedAt DATETIME NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repairOrders' AND COLUMN_NAME = 'urgeCount'
  ) THEN
    ALTER TABLE repairOrders ADD COLUMN urgeCount INT NOT NULL DEFAULT 0;
  END IF;

  -- evaluations 双向评价字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evaluations' AND COLUMN_NAME = 'repairmanRating'
  ) THEN
    ALTER TABLE evaluations ADD COLUMN repairmanRating INT NULL CHECK (repairmanRating BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evaluations' AND COLUMN_NAME = 'repairmanComment'
  ) THEN
    ALTER TABLE evaluations ADD COLUMN repairmanComment TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evaluations' AND COLUMN_NAME = 'repairmanEvaluatedAt'
  ) THEN
    ALTER TABLE evaluations ADD COLUMN repairmanEvaluatedAt DATETIME NULL;
  END IF;
END$$
DELIMITER ;

CALL add_column_if_missing();
DROP PROCEDURE IF EXISTS add_column_if_missing;

-- 5. 添加外键（条件判断）
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

-- 6. 添加索引（条件判断）
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'repairOrders'
    AND INDEX_NAME = 'idx_repairmanId'
);
SET @sql2 = IF(@idx_exists = 0,
  'CREATE INDEX idx_repairmanId ON repairOrders (repairmanId)',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 7. 测试住户数据
INSERT IGNORE INTO residents (studentId, name, phone, building, roomNumber, qqEmail)
VALUES ('2024001', '张三', '13800000000', 'A栋', '101', '123456789@qq.com');
