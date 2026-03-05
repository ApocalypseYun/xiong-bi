-- ============================================
-- 宿舍报修系统数据库初始化脚本
-- ============================================

-- 表1: users (用户表)
CREATE TABLE users (
  userId INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('student', 'repairman', 'super_admin') DEFAULT 'student',
  realName VARCHAR(50),
  phone VARCHAR(20),
  roomNumber VARCHAR(50),
  building VARCHAR(50),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 表2: repairOrders (报修订单表)
CREATE TABLE repairOrders (
  orderId INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  repairType VARCHAR(50) NOT NULL,
  building VARCHAR(50) NOT NULL,
  roomNumber VARCHAR(50) NOT NULL,
  contactPhone VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'withdrawn') DEFAULT 'pending',
  adminId INT,
  repairmanId INT NULL,
  completedAt DATETIME,
  lastUrgedAt DATETIME NULL,
  urgeCount INT NOT NULL DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(userId),
  FOREIGN KEY (adminId) REFERENCES users(userId),
  FOREIGN KEY (repairmanId) REFERENCES users(userId),
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 表3: orderImages (订单图片表)
CREATE TABLE orderImages (
  imageId INT PRIMARY KEY AUTO_INCREMENT,
  orderId INT NOT NULL,
  imageUrl VARCHAR(500) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES repairOrders(orderId) ON DELETE CASCADE,
  INDEX idx_orderId (orderId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 表4: completionImages (完成凭证图片表)
CREATE TABLE completionImages (
  imageId INT PRIMARY KEY AUTO_INCREMENT,
  orderId INT NOT NULL,
  imageUrl VARCHAR(500) NOT NULL,
  uploadedBy INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES repairOrders(orderId) ON DELETE CASCADE,
  FOREIGN KEY (uploadedBy) REFERENCES users(userId),
  INDEX idx_orderId (orderId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 表5: evaluations (评价表)
CREATE TABLE evaluations (
  evaluationId INT PRIMARY KEY AUTO_INCREMENT,
  orderId INT UNIQUE NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  repairmanRating INT NULL,
  repairmanComment TEXT NULL,
  repairmanEvaluatedAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES repairOrders(orderId) ON DELETE CASCADE,
  INDEX idx_orderId (orderId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 表6: announcements (公告表)
CREATE TABLE announcements (
  announcementId INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  publishedBy INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (publishedBy) REFERENCES users(userId),
  INDEX idx_isActive (isActive),
  INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 表7: residents (住户预置表)
CREATE TABLE residents (
  residentId   INT PRIMARY KEY AUTO_INCREMENT,
  studentId    VARCHAR(50) UNIQUE NOT NULL,
  name         VARCHAR(50) NOT NULL,
  phone        VARCHAR(20) NOT NULL,
  building     VARCHAR(50) NOT NULL,
  roomNumber   VARCHAR(50) NOT NULL,
  qqEmail      VARCHAR(100) NOT NULL,
  isRegistered BOOLEAN DEFAULT FALSE,
  createdAt    DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_studentId (studentId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 测试数据
-- ============================================

-- 插入测试管理员 (密码: admin123)
INSERT INTO users (username, password, role, realName) VALUES ('admin', '$2a$10$SVQ1rDR4wNEUiwYBbcCY9OpFp1lCwgKHJEglHLJn9G.0czHj.QY0m', 'super_admin', '系统管理员');

-- 插入测试学生 (密码: 123456)
INSERT INTO users (username, password, role, realName, roomNumber, building) VALUES ('2024001', '$2a$10$Vhx.oSNyOIjUaSeCpXUw.es3PACaqnCyNam6ehBeKg8hwmieVYnPi', 'student', '张三', '101', 'A栋');

-- 插入测试公告
INSERT INTO announcements (title, content, publishedBy)
VALUES ('欢迎使用宿舍报修系统', '本系统用于提交宿舍维修申请，请如实填写报修信息。', 1);

-- 插入测试住户预置数据
INSERT INTO residents (studentId, name, phone, building, roomNumber, qqEmail)
VALUES ('2024001', '张三', '13800000000', 'A栋', '101', '123456789@qq.com');
