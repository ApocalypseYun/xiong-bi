# 宿舍报修系统开发计划

## TL;DR

> **项目概述**: 完整的微信小程序宿舍报修系统，包含学生端和管理端
> 
> **技术栈**: 
> - 前端: 微信小程序 (WXML/WXSS/JS)
> - 后端: Node.js + Express
> - 数据库: MySQL
> - 图片存储: 本地服务器文件夹
> 
> **核心功能**:
> - 登录/注册 (学生/管理员双角色)
> - 学生端: 公告、报修、记录查询、评价
> - 管理员端: 订单处理、公告管理、评价查看
> 
> **Estimated Effort**: Large (预计 8-12 小时开发时间)
> **Parallel Execution**: YES - 前后端可并行开发
> **Critical Path**: 数据库设计 → 后端API → 前端页面

---

## Context

### Original Request
用户需要一个宿舍报修系统：
- 微信小程序前端 (WXML/WXSS)
- Node.js后端 + MySQL数据库
- 本地开发部署

功能需求：
1. **登录/注册**: 学生/管理员双角色，简单账号密码，找回密码
2. **学生页面**: 公告、报修(类型/地址/描述/图片)、维修记录(筛选)、评价(仅已完成)
3. **管理员页面**: 待处理订单、完成报修(上传凭证)、已完成订单(日期筛选)、公告管理、查看评价

### Interview Summary
**Key Discussions**:
- 后端框架: 选择Express (成熟稳定)
- 图片存储: 本地服务器文件夹 (public/images/)
- 公告管理: 管理员可发布/编辑/删除
- 命名规范: camelCase (驼峰命名)
- 安全性: 无需考虑，实现功能即可
- UI要求: 需要美观

### Research Findings
- 微信小程序: 使用wx.request调用API，wx.uploadFile上传图片
- Express最佳实践: 模块化路由、中间件分离、MVC架构
- 图片上传: 使用multer中间件处理multipart/form-data
- MySQL连接: 使用mysql2库，支持Promise和连接池

---

## Work Objectives

### Core Objective
开发一个功能完整的宿舍报修系统，支持学生提交报修、管理员处理订单、双方评价反馈的完整业务流程。

### Concrete Deliverables
1. **后端服务** (`server/`)
   - Express服务器 (app.js)
   - 数据库配置文件 (config/database.js)
   - API路由 (routes/)
   - 控制器逻辑 (controllers/)
   - JWT认证中间件 (middleware/auth.js)
   - 图片上传中间件 (middleware/upload.js)
   - 数据库初始化SQL (sql/init.sql)

2. **微信小程序** (`mini-program/`)
   - 登录/注册页面
   - 学生首页及功能页面
   - 管理员首页及功能页面
   - 公共组件和工具函数

3. **数据库** (MySQL)
   - 6张数据表: users, repairOrders, orderImages, completionImages, evaluations, announcements
   - 预设数据和索引优化

### Definition of Done
- [ ] 后端API全部实现并通过测试
- [ ] 微信小程序所有页面完成
- [ ] 数据库表结构创建并包含测试数据
- [ ] 前后端联调通过 (登录/报修/处理/评价完整流程)
- [ ] 本地可正常运行

### Must Have
- 学生和管理员双角色登录
- 报修类型选择 + 图片上传
- 订单状态流转 (待处理→处理中→已完成)
- 维修评价功能 (仅已完成可评价)
- 公告管理 (管理员发布)

### Must NOT Have (Guardrails)
- 密码加密 (用户要求无需考虑安全性)
- 短信验证码
- 微信支付集成
- 数据备份/恢复功能
- 日志系统
- 性能优化 (缓存、CDN等)
- 单元测试 (无需测试框架)

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> ALL verification is executed by the agent using tools (Playwright, interactive_bash, curl, etc.).

### Test Decision
- **Infrastructure exists**: NO (需要初始化项目)
- **Automated tests**: NO (用户不要求测试框架)
- **Framework**: None

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **后端API** | Bash (curl/httpie) | Send requests, parse JSON responses |
| **数据库** | Bash (mysql CLI) | Execute SQL, check table structure and data |
| **服务器启动** | Bash (curl) | Check health endpoint |
| **文件生成** | Bash (ls/find) | Verify files exist at expected paths |
| **微信小程序** | Manual verification required* | Code review + structure validation |

*注: 微信小程序需要在微信开发者工具中运行，自动化测试受限。将通过代码结构验证和文件检查来确保完成。

**Each Scenario Format:**
```
Scenario: [Descriptive name]
  Tool: [Bash]
  Preconditions: [Requirements]
  Steps:
    1. [Exact command with parameters]
    2. [Expected output check]
  Expected Result: [Concrete outcome]
  Evidence: [Output capture]
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: 创建项目目录结构
├── Task 2: 初始化Node.js后端项目
└── Task 3: 初始化微信小程序项目

Wave 2 (After Wave 1):
├── Task 4: 创建数据库和表结构
└── Task 5: 配置Express服务器和中间件

Wave 3 (After Wave 2):
├── Task 6: 实现认证API (注册/登录/找回密码)
├── Task 7: 实现用户管理API
└── Task 8: 实现图片上传API

Wave 4 (After Wave 3):
├── Task 9: 实现报修订单API (学生端)
├── Task 10: 实现管理员订单API
└── Task 11: 实现评价和公告API

Wave 5 (After Wave 2 - Parallel with Waves 3-4):
├── Task 12: 开发登录/注册页面
├── Task 13: 开发学生首页和报修页面
└── Task 14: 开发学生记录和评价页面

Wave 6 (After Wave 5):
├── Task 15: 开发管理员首页
├── Task 16: 开发管理员订单处理页面
└── Task 17: 开发公告管理页面

Wave 7 (Final):
└── Task 18: 创建启动脚本和使用文档
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 4, 5 | 3 |
| 3 | 1 | 12, 13, 14 | 2 |
| 4 | 2 | 6, 7, 8, 9, 10, 11 | 5 |
| 5 | 2 | 6, 7, 8, 9, 10, 11 | 4 |
| 6 | 4, 5 | None | 7, 8 |
| 7 | 4, 5 | None | 6, 8 |
| 8 | 4, 5 | 9, 10 | 6, 7 |
| 9 | 6, 7, 8 | 11 | 10 |
| 10 | 6, 7, 8 | 11 | 9 |
| 11 | 9, 10 | None | None |
| 12 | 3 | 15 | 13, 14 |
| 13 | 3 | 15 | 12, 14 |
| 14 | 3 | 16 | 12, 13 |
| 15 | 12, 13, 14 | 16 | None |
| 16 | 15 | 17 | None |
| 17 | 16 | 18 | None |
| 18 | All | None | None |

---

## TODOs

### Wave 1: 项目初始化

- [x] 1. 创建项目目录结构

  **What to do**:
  - 创建主项目目录 `dormitory-repair-system/`
  - 创建后端目录 `server/` 及其子目录结构
  - 创建前端目录 `mini-program/` 及其子目录结构
  
  **Directory Structure**:
  ```
  dormitory-repair-system/
  ├── server/
  │   ├── config/
  │   ├── routes/
  │   ├── middleware/
  │   ├── controllers/
  │   ├── models/
  │   ├── utils/
  │   ├── public/images/
  │   └── sql/
  └── mini-program/
      ├── pages/
      ├── components/
      └── utils/
  ```

  **Must NOT do**:
  - 不要创建不必要的深层目录
  - 不要添加.gitignore等版本控制文件

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Justification**: 简单目录创建，无需特殊技能

  **Parallelization**:
  - **Can Run In Parallel**: NO (需要按顺序创建)
  - **Blocks**: Task 2, Task 3

  **References**:
  - Directory structure defined in draft file

  **Acceptance Criteria**:
  - [ ] 所有目录成功创建
  - [ ] `ls -R dormitory-repair-system/` 显示完整目录树

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify directory structure created
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: ls -la dormitory-repair-system/
      2. Run: ls -la dormitory-repair-system/server/
      3. Run: ls -la dormitory-repair-system/mini-program/
    Expected Result: All directories exist with correct names
    Evidence: Terminal output showing directory listing
  ```

  **Commit**: NO

---

- [x] 2. 初始化Node.js后端项目

  **What to do**:
  - 在 `server/` 目录下运行 `npm init -y`
  - 安装依赖包: express, mysql2, cors, body-parser, multer, jsonwebtoken, dotenv, nodemon (dev)
  - 创建基础文件: app.js, package.json, .env
  
  **Package List**:
  ```json
  {
    "dependencies": {
      "express": "^4.18.2",
      "mysql2": "^3.6.0",
      "cors": "^2.8.5",
      "body-parser": "^1.20.2",
      "multer": "^1.4.5-lts.1",
      "jsonwebtoken": "^9.0.2",
      "dotenv": "^16.3.1"
    },
    "devDependencies": {
      "nodemon": "^3.0.1"
    }
  }
  ```

  **app.js Skeleton**:
  ```javascript
  const express = require('express');
  const cors = require('cors');
  const bodyParser = require('body-parser');
  require('dotenv').config();

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Routes will be added here

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  ```

  **.env Template**:
  ```
  PORT=3000
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=your_password
  DB_NAME=dormitory_repair
  JWT_SECRET=your_jwt_secret_key
  ```

  **Must NOT do**:
  - 不要提交真实的密码到代码
  - 不要添加未使用的依赖

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []
  - **Justification**: 标准npm初始化，基础Node.js项目设置

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3)
  - **Blocked By**: Task 1
  - **Blocks**: Task 4, Task 5

  **References**:
  - Express官方文档: https://expressjs.com/
  - mysql2文档: https://github.com/sidorares/node-mysql2

  **Acceptance Criteria**:
  - [ ] `server/package.json` 存在且包含所有依赖
  - [ ] `server/app.js` 基础骨架完成
  - [ ] `server/.env` 模板文件创建
  - [ ] `npm install` 可成功运行

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify package.json and dependencies
    Tool: Bash
    Preconditions: Task 1 completed
    Steps:
      1. Run: cd dormitory-repair-system/server && cat package.json
      2. Assert: package.json contains express, mysql2, cors dependencies
      3. Run: npm install
      4. Assert: node_modules directory created
    Expected Result: npm install completes without errors
    Evidence: package.json content and npm install output
  ```

  **Commit**: NO

---

- [x] 3. 初始化微信小程序项目结构

  **What to do**:
  - 在 `mini-program/` 目录下创建小程序基础文件
  - 创建页面目录结构
  - 配置 app.json, app.js, app.wxss
  
  **File Structure**:
  ```
  mini-program/
  ├── pages/
  │   ├── index/          # 登录页
  │   ├── register/       # 注册页
  │   ├── forgot-password/# 找回密码
  │   ├── student/        # 学生首页
  │   ├── student-repair/ # 我要报修
  │   ├── student-records/# 维修记录
  │   ├── student-evaluation/ # 维修评价
  │   ├── admin/          # 管理员首页
  │   ├── admin-pending/  # 待处理订单
  │   ├── admin-completed/# 已完成订单
  │   ├── admin-announcements/ # 公告管理
  │   └── admin-evaluations/   # 我的评价
  ├── components/         # 公共组件
  ├── utils/              # 工具函数
  │   ├── request.js      # API请求封装
  │   └── storage.js      # 本地存储封装
  ├── app.js
  ├── app.json
  ├── app.wxss
  └── project.config.json
  ```

  **app.json Configuration**:
  ```json
  {
    "pages": [
      "pages/index/index",
      "pages/register/register",
      "pages/forgot-password/forgot-password",
      "pages/student/student",
      "pages/student-repair/student-repair",
      "pages/student-records/student-records",
      "pages/student-evaluation/student-evaluation",
      "pages/admin/admin",
      "pages/admin-pending/admin-pending",
      "pages/admin-completed/admin-completed",
      "pages/admin-announcements/admin-announcements",
      "pages/admin-evaluations/admin-evaluations"
    ],
    "window": {
      "backgroundTextStyle": "light",
      "navigationBarBackgroundColor": "#fff",
      "navigationBarTitleText": "宿舍报修系统",
      "navigationBarTextStyle": "black"
    },
    "style": "v2",
    "sitemapLocation": "sitemap.json"
  }
  ```

  **utils/request.js Skeleton**:
  ```javascript
  const BASE_URL = 'http://localhost:3000/api';

  const request = (options) => {
    return new Promise((resolve, reject) => {
      wx.request({
        url: BASE_URL + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'Content-Type': 'application/json',
          'Authorization': wx.getStorageSync('token') || ''
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(res.data);
          }
        },
        fail: reject
      });
    });
  };

  module.exports = {
    get: (url, data) => request({ url, data, method: 'GET' }),
    post: (url, data) => request({ url, data, method: 'POST' }),
    put: (url, data) => request({ url, data, method: 'PUT' }),
    del: (url) => request({ url, method: 'DELETE' })
  };
  ```

  **Must NOT do**:
  - 不要创建页面具体实现（只创建骨架）
  - 不要添加复杂样式（基础样式即可）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
  - **Justification**: 需要了解微信小程序结构和最佳实践，UI/UX技能有助于美观设计

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Blocked By**: Task 1
  - **Blocks**: Task 12, Task 13, Task 14

  **References**:
  - 微信小程序官方文档: https://developers.weixin.qq.com/miniprogram/dev/framework/
  - 小程序项目结构指南

  **Acceptance Criteria**:
  - [ ] 所有页面目录和基础文件(.js, .wxml, .wxss, .json)创建
  - [ ] app.json 配置正确，包含所有页面路径
  - [ ] utils/request.js 封装完成
  - [ ] 项目可在微信开发者工具中打开

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify mini-program structure
    Tool: Bash
    Preconditions: Task 1 completed
    Steps:
      1. Run: find dormitory-repair-system/mini-program -name "*.js" | wc -l
      2. Assert: At least 11 .js files (one per page)
      3. Run: cat dormitory-repair-system/mini-program/app.json
      4. Assert: Contains all page paths
    Expected Result: All required files exist
    Evidence: File listing and app.json content
  ```

  **Commit**: NO

---

### Wave 2: 数据库和服务器配置

- [x] 4. 创建数据库和表结构

  **What to do**:
  - 编写完整的数据库初始化SQL脚本
  - 创建 `server/sql/init.sql`
  - 包含所有6张表的CREATE TABLE语句
  - 添加索引优化
  - 添加测试数据（可选）
  
  **Tables to Create**:
  1. users - 用户表
  2. repairOrders - 报修订单表
  3. orderImages - 订单图片表
  4. completionImages - 完成凭证图片表
  5. evaluations - 评价表
  6. announcements - 公告表

  **SQL Schema** (完整版在draft文件中):
  ```sql
  -- 用户表
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

  -- 其他表...
  ```

  **Test Data**:
  ```sql
  -- 插入测试管理员
  INSERT INTO users (username, password, role, realName) 
  VALUES ('admin', 'admin123', 'admin', '系统管理员');

  -- 插入测试学生
  INSERT INTO users (username, password, role, realName, roomNumber, building) 
  VALUES ('2024001', '123456', 'student', '张三', '101', 'A栋');
  ```

  **Must NOT do**:
  - 不要执行SQL（只创建脚本，执行是环境配置）
  - 不要添加外键约束错误（确保ON DELETE正确）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []
  - **Justification**: 标准SQL编写，需要理解关系型数据库设计

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Blocked By**: Task 2
  - **Blocks**: Task 6, 7, 8, 9, 10, 11

  **References**:
  - Draft文件中的数据库设计
  - MySQL官方文档: https://dev.mysql.com/doc/

  **Acceptance Criteria**:
  - [ ] `server/sql/init.sql` 文件创建
  - [ ] 包含所有6张表的CREATE TABLE语句
  - [ ] 包含索引定义
  - [ ] 包含外键约束
  - [ ] SQL语法正确（通过基本验证）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify SQL schema file
    Tool: Bash
    Preconditions: Task 2 completed
    Steps:
      1. Run: cat dormitory-repair-system/server/sql/init.sql
      2. Assert: Contains CREATE TABLE for all 6 tables
      3. Assert: Contains PRIMARY KEY definitions
      4. Assert: Contains FOREIGN KEY references
    Expected Result: SQL file is complete and syntactically valid
    Evidence: File content inspection
  ```

  **Commit**: NO

---

- [x] 5. 配置Express服务器和中间件

  **What to do**:
  - 完成 `server/app.js` 实现
  - 创建数据库连接配置 `server/config/database.js`
  - 创建响应工具 `server/utils/response.js`
  - 创建JWT认证中间件 `server/middleware/auth.js`
  - 创建图片上传中间件 `server/middleware/upload.js`
  
  **Files to Create**:

  **server/config/database.js**:
  ```javascript
  const mysql = require('mysql2/promise');
  require('dotenv').config();

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dormitory_repair',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  module.exports = pool;
  ```

  **server/utils/response.js**:
  ```javascript
  const success = (res, data, message = 'Success') => {
    res.json({ code: 200, message, data });
  };

  const error = (res, message = 'Error', code = 500) => {
    res.status(code).json({ code, message });
  };

  module.exports = { success, error };
  ```

  **server/middleware/auth.js**:
  ```javascript
  const jwt = require('jsonwebtoken');
  const { error } = require('../utils/response');

  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return error(res, 'Token required', 401);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return error(res, 'Invalid token', 401);
    }
  };

  const authorize = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return error(res, 'Insufficient permissions', 403);
    }
    next();
  };

  module.exports = { authenticate, authorize, JWT_SECRET };
  ```

  **server/middleware/upload.js**:
  ```javascript
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');

  const uploadDir = path.join(__dirname, '../public/images');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files allowed'));
      }
    }
  });

  module.exports = upload;
  ```

  **Updated server/app.js**:
  ```javascript
  const express = require('express');
  const cors = require('cors');
  const bodyParser = require('body-parser');
  const path = require('path');
  require('dotenv').config();

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use('/images', express.static(path.join(__dirname, 'public/images')));

  // Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/user', require('./routes/user'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/upload', require('./routes/upload'));
  app.use('/api/evaluations', require('./routes/evaluations'));
  app.use('/api/announcements', require('./routes/announcements'));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  ```

  **Must NOT do**:
  - 不要在代码中硬编码敏感信息（使用环境变量）
  - 不要跳过错误处理

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []
  - **Justification**: Express中间件配置，标准Node.js后端开发

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Blocked By**: Task 2
  - **Blocks**: Task 6, 7, 8, 9, 10, 11

  **References**:
  - Express中间件文档: https://expressjs.com/en/guide/using-middleware.html
  - multer文档: https://github.com/expressjs/multer
  - jsonwebtoken文档: https://github.com/auth0/node-jsonwebtoken

  **Acceptance Criteria**:
  - [ ] `server/app.js` 完整实现，包含所有路由挂载
  - [ ] `server/config/database.js` 数据库连接池配置
  - [ ] `server/utils/response.js` 响应工具函数
  - [ ] `server/middleware/auth.js` JWT认证中间件
  - [ ] `server/middleware/upload.js` 文件上传中间件
  - [ ] `npm start` 可启动服务器

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify server starts successfully
    Tool: Bash
    Preconditions: Tasks 2, 5 completed
    Steps:
      1. Run: cd dormitory-repair-system/server && npm start &
      2. Wait: 3 seconds
      3. Run: curl http://localhost:3000/health
      4. Assert: Response contains "status: OK"
      5. Run: pkill -f "node.*app.js"
    Expected Result: Server starts and responds to health check
    Evidence: curl response showing { status: "OK" }
  ```

  **Commit**: NO

---
### Wave 3: 核心API实现 (认证、用户、上传)

- [x] 6. 实现认证API (注册/登录/找回密码)

  **What to do**:
  - 创建 `server/routes/auth.js` 和 `server/controllers/authController.js`
  - 实现注册、登录、找回密码三个API
  - 使用JWT进行认证
  
  **API Endpoints**:
  - POST /api/auth/register: username, password, confirmPassword, role
  - POST /api/auth/login: username, password, role → 返回token
  - POST /api/auth/reset-password: username, newPassword, confirmPassword

  **Acceptance Criteria**:
  - [ ] 注册API创建用户成功
  - [ ] 登录API返回有效JWT
  - [ ] 找回密码可更新密码
  - [ ] 用户名唯一性验证

  **Agent-Executed QA**:
  ```bash
  # Test register
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"123","confirmPassword":"123","role":"student"}'
  
  # Test login
  curl -X POST http://localhost:3000/api/auth/login \
    -d '{"username":"test","password":"123","role":"student"}'
  ```

  **Commit**: NO

---

- [x] 7. 实现用户管理API

  **What to do**:
  - 创建 `server/routes/user.js` 和 `server/controllers/userController.js`
  - GET /api/user/profile - 获取用户信息
  - PUT /api/user/profile - 更新用户信息

  **Acceptance Criteria**:
  - [ ] 可获取当前登录用户信息
  - [ ] 可更新realName, phone, roomNumber, building
  - [ ] 不返回password字段

  **Commit**: NO

---

- [x] 8. 实现图片上传API

  **What to do**:
  - 创建 `server/routes/upload.js`
  - POST /api/upload/repair - 报修图片上传(学生)
  - POST /api/upload/completion - 完成凭证上传(管理员)
  - 使用multer处理multipart/form-data

  **Acceptance Criteria**:
  - [ ] 图片上传成功保存到public/images/
  - [ ] 返回完整URL路径
  - [ ] 权限验证正确

  **Commit**: NO

---

### Wave 4: 业务API实现 (订单、评价、公告)

- [x] 9. 实现报修订单API (学生端)

  **What to do**:
  - POST /api/orders - 创建报修单(含图片关联)
  - GET /api/orders - 获取我的报修列表(支持status筛选)
  - GET /api/orders/:id - 获取报修详情(含图片和评价)

  **Acceptance Criteria**:
  - [ ] 可创建报修单并关联图片
  - [ ] 列表支持pending/processing/completed筛选
  - [ ] 详情包含完整信息
  - [ ] 事务处理保证数据一致性

  **Commit**: NO

---

- [x] 10. 实现管理员订单API

  **What to do**:
  - GET /api/admin/orders - 获取所有订单(支持日期筛选)
  - GET /api/admin/orders/pending - 待处理订单
  - PUT /api/admin/orders/:id/accept - 接单
  - PUT /api/admin/orders/:id/complete - 完成订单(上传凭证)

  **Acceptance Criteria**:
  - [ ] 日期范围筛选正常
  - [ ] 接单后状态变为processing
  - [ ] 完成时可上传多张凭证图片
  - [ ] 状态流转正确

  **Commit**: NO

---

- [x] 11. 实现评价和公告API

  **What to do**:
  - POST /api/evaluations - 学生创建评价(仅completed订单)
  - GET /api/evaluations - 我的评价
  - GET /api/admin/evaluations - 管理员查看所有评价
  - GET /api/announcements - 公告列表(公开)
  - POST /api/admin/announcements - 发布公告
  - PUT /api/admin/announcements/:id - 编辑公告
  - DELETE /api/admin/announcements/:id - 删除公告

  **Acceptance Criteria**:
  - [ ] 评价与订单一对一
  - [ ] 只能评价completed订单
  - [ ] 公告CRUD完整
  - [ ] 公告按时间倒序

  **Commit**: NO

---

### Wave 5: 前端登录和学生页面

- [x] 12. 开发登录/注册/找回密码页面

  **What to do**:
  - `pages/index/index` - 登录页面(学生/管理员切换)
  - `pages/register/register` - 注册页面
  - `pages/forgot-password/forgot-password` - 找回密码

  **UI Requirements**:
  - 美观现代的登录界面
  - 角色切换(学生/管理员)
  - 表单验证(前端基础验证)
  - 跳转链接

  **Acceptance Criteria**:
  - [ ] 登录页面可选择角色
  - [ ] 注册页面可创建账号
  - [ ] 找回密码功能可用
  - [ ] 登录后保存token到本地存储
  - [ ] 根据角色跳转到不同首页

  **Commit**: NO

---

- [x] 13. 开发学生首页和报修页面

  **What to do**:
  - `pages/student/student` - 学生首页(公告+功能入口)
  - `pages/student-repair/student-repair` - 我要报修

  **UI Features**:
  - 首页显示公告轮播/列表
  - 报修类型选择器
  - 楼栋/房间号输入
  - 故障描述文本域
  - 图片选择上传(wx.chooseImage + wx.uploadFile)
  - 提交按钮

  **Acceptance Criteria**:
  - [ ] 公告正确显示
  - [ ] 报修表单可填写
  - [ ] 图片可多选上传
  - [ ] 提交后跳转成功提示

  **Commit**: NO

---

- [x] 14. 开发学生记录和评价页面

  **What to do**:
  - `pages/student-records/student-records` - 维修记录
  - `pages/student-evaluation/student-evaluation` - 维修评价

  **UI Features**:
  - 记录页面: Tab切换(全部/待处理/处理中/已完成)
  - 列表显示订单卡片(类型、状态、时间)
  - 详情查看
  - 评价页面: 星级评分组件(1-5⭐)
  - 评价文本输入
  - 仅completed订单可评价

  **Acceptance Criteria**:
  - [ ] Tab筛选功能正常
  - [ ] 订单列表正确显示
  - [ ] 可提交评价
  - [ ] 已评价订单显示评价

  **Commit**: NO

---

### Wave 6: 前端管理员页面

- [x] 15. 开发管理员首页

  **What to do**:
  - `pages/admin/admin` - 管理员首页
  - 功能入口: 待处理订单、已完成订单、公告管理、我的评价

  **Acceptance Criteria**:
  - [ ] 首页显示功能入口
  - [ ] 显示待处理订单数量
  - [ ] 可跳转到各功能页面

  **Commit**: NO

---

- [x] 16. 开发管理员订单处理页面

  **What to do**:
  - `pages/admin-pending/admin-pending` - 待处理订单
  - `pages/admin-completed/admin-completed` - 已完成订单

  **UI Features**:
  - 待处理: 列表显示，点击查看详情，接单按钮
  - 完成订单: 上传完成凭证图片
  - 已完成: 日期筛选器，订单列表

  **Acceptance Criteria**:
  - [ ] 可查看待处理订单列表
  - [ ] 可接单(状态变为处理中)
  - [ ] 完成时可上传凭证
  - [ ] 已完成支持日期筛选

  **Commit**: NO

---

- [x] 17. 开发公告管理页面

  **What to do**:
  - `pages/admin-announcements/admin-announcements` - 公告管理
  - `pages/admin-evaluations/admin-evaluations` - 我的评价(只读)

  **UI Features**:
  - 公告列表显示
  - 新增公告表单(标题、内容)
  - 编辑公告
  - 删除公告
  - 评价列表(只读，显示星级和内容)

  **Acceptance Criteria**:
  - [ ] 可发布新公告
  - [ ] 可编辑/删除公告
  - [ ] 可查看所有评价

  **Commit**: NO

---

### Wave 7: 部署和文档

- [x] 18. 创建启动脚本和使用文档

  **What to do**:
  - 创建 `README.md` - 项目说明和部署指南
  - 创建 `server/start.sh` - 后端启动脚本
  - 创建 `server/package.json` scripts (start, dev)
  - 添加测试数据SQL
  - 创建微信小程序项目配置

  **README Contents**:
  - 项目简介
  - 技术栈
  - 安装步骤(后端依赖、数据库导入)
  - 配置说明(.env设置)
  - 启动命令
  - 微信小程序导入说明
  - API文档链接

  **Acceptance Criteria**:
  - [ ] README文档完整
  - [ ] 启动脚本可执行
  - [ ] 包含测试账号(admin/admin123, 2024001/123456)
  - [ ] 配置说明清晰

  **Commit**: YES
  - Message: `docs: complete dormitory repair system with documentation`

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|-------|
| 18 (Final) | `docs: complete dormitory repair system` | All |

**Note**: Most tasks are NO commit to allow batching, final commit groups everything.

---

## Success Criteria

### Backend Verification Commands
```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Test auth flow
curl -X POST http://localhost:3000/api/auth/register -d '{"username":"test","password":"123","confirmPassword":"123","role":"student"}'
curl -X POST http://localhost:3000/api/auth/login -d '{"username":"test","password":"123","role":"student"}'

# 3. Test order creation (with token)
curl -X POST http://localhost:3000/api/orders -H "Authorization: Bearer TOKEN" \
  -d '{"repairType":"test","building":"A","roomNumber":"101","contactPhone":"138","description":"test"}'

# 4. Verify database tables
mysql -u root -p -e "USE dormitory_repair; SHOW TABLES;"
```

### Frontend Verification
- [ ] 微信小程序可在开发者工具中正常打开
- [ ] 登录后可进入对应角色首页
- [ ] 所有页面可正常导航
- [ ] 图片上传功能正常

### Final Checklist
- [ ] 学生可提交报修(含图片)
- [ ] 管理员可处理订单(接单→完成)
- [ ] 学生可评价已完成订单
- [ ] 公告正确显示在首页
- [ ] 本地部署文档完整

---

## Notes for Executor

1. **Database Setup**: Run `server/sql/init.sql` in MySQL before testing
2. **Environment**: Copy `.env.example` to `.env` and configure DB credentials
3. **Image Storage**: Ensure `server/public/images/` directory exists and is writable
4. **CORS**: Backend already configured for localhost:3000
5. **Mini Program**: Use "不校验合法域名" option in WeChat DevTools for local testing

**Estimated Total Development Time**: 8-12 hours depending on agent speed and parallelization.
