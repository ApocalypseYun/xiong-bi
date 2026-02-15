-- ============================================
-- 宿舍报修系统数据库初始化脚本
-- ============================================

-- 表1: users (用户表)
CREATE TABLE users (
  userId INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin') DEFAULT 'student',
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
  status ENUM('pending', 'processing', 'completed') DEFAULT 'pending',
  adminId INT,
  completedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(userId),
  FOREIGN KEY (adminId) REFERENCES users(userId),
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

-- ============================================
-- 测试数据
-- ============================================

-- 插入测试管理员
INSERT INTO users (username, password, role, realName) 
VALUES ('admin', 'admin123', 'admin', '系统管理员');

-- 插入测试学生
INSERT INTO users (username, password, role, realName, roomNumber, building) 
VALUES ('2024001', '123456', 'student', '张三', '101', 'A栋');

-- 插入测试公告
INSERT INTO announcements (title, content, publishedBy) 
VALUES ('欢迎使用宿舍报修系统', '本系统用于提交宿舍维修申请，请如实填写报修信息。', 1);
