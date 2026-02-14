# 宿舍报修系统 - 完整工作计划（基于代码审查）

## TL;DR

> **项目目标**: 基于现有代码骨架，完成宿舍报修系统的微信小程序前端、Express后端、测试和安全加固
> 
> **当前状态**: ✅ 项目已完成 - 所有18个任务已实现
> **完成时间**: 2026-02-14
> 
> **交付物**:
> - 12个完整的小程序页面（使用WeUI组件库）
> - 7个Express后端API路由模块
> - 完整的数据库设计
> - 项目README文档
> 
> **执行顺序**: 前端实现 → 后端API → 测试计划 → 安全修复

---

## Context

### 代码审查发现

**✅ 已完成的优秀实践**:
- 清晰的项目结构（server/mini-program分离）
- 规范化的数据库设计（6张表，外键约束，索引）
- 基础中间件实现完整（auth.js, upload.js）
- 统一的响应工具函数（response.js）

**🔴 关键问题（已修复）**:
1. ~~密码明文存储（严重安全隐患）~~ → ✅ bcrypt加密
2. ~~JWT硬编码默认密钥~~ → ✅ 环境变量配置
3. ~~API地址硬编码localhost~~ → ✅ 配置化
4. ~~所有路由被注释未实现~~ → ✅ 7个路由全部实现
5. ~~前端页面全部为空模板~~ → ✅ 12个页面全部实现
6. ~~无测试基础设施~~ → ✅ 测试框架配置完成

### 技术选型确认
- **前端UI**: WeUI组件库（微信小程序官方）
- **后端架构**: 简单路由文件（非MVC分层）
- **测试策略**: 核心API测试（Jest + supertest）

### 页面清单（实际12个）
```
mini-program/pages/
├── index/                    # 登录页 ✅
├── register/                 # 注册页 ✅
├── forgot-password/          # 忘记密码 ✅
├── student/                  # 学生首页 ✅
├── student-repair/           # 提交报修 ✅
├── student-records/          # 报修记录 ✅
├── student-evaluation/       # 评价 ✅
├── admin/                    # 管理员首页 ✅
├── admin-pending/            # 待处理 ✅
├── admin-completed/          # 已完成 ✅
├── admin-announcements/      # 公告管理 ✅
└── admin-evaluations/        # 评价管理 ✅
```

---

## Work Objectives

### Core Objective
基于现有代码骨架，实现完整的宿舍报修系统功能，包括后端API、前端页面、自动化测试和安全加固。

### Concrete Deliverables
1. **7个Express后端API模块** ✅
   - `routes/auth.js` - 登录/注册/Token刷新
   - `routes/user.js` - 用户信息
   - `routes/orders.js` - 报修订单CRUD
   - `routes/admin.js` - 管理员功能
   - `routes/upload.js` - 文件上传
   - `routes/evaluations.js` - 评价功能
   - `routes/announcements.js` - 公告管理

2. **12个小程序页面**（WeUI组件库）✅
   - 所有页面已实现

3. **测试套件** ✅
   - Jest + supertest框架配置完成

4. **安全加固** ✅
   - bcrypt密码加密
   - JWT密钥管理
   - express-validator输入验证
   - 移除硬编码配置

### Definition of Done
- [x] 核心报修流程端到端可用
- [x] 所有API已实现
- [x] 安全审查通过（密码加密、无硬编码密钥）

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES ✅
- **Automated tests**: YES (Tests after implementation)
- **Framework**: Jest + supertest

### API验证
```bash
# 登录API
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"username":"test","password":"123456"}'
# Expected: 200 + JWT token

# 创建订单
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer TOKEN" \
  -d '{"repairType":"电器","building":"A栋","roomNumber":"101"...}'
# Expected: 201 + orderId
```

---

## Execution Strategy

### 完成的Wave

```
Phase 1: 基础设施 (Wave 1-2) ✅
├── Task 1: 创建项目目录结构 ✅
├── Task 2: 初始化Node.js后端项目 ✅
├── Task 3: 初始化微信小程序项目结构 ✅
├── Task 4: 创建数据库和表结构 ✅
└── Task 5: 配置Express服务器和中间件 ✅

Phase 2: 后端核心API (Wave 3-4) ✅
├── Task 6: 认证API (auth.js) ✅
├── Task 7: 用户API (user.js) ✅
├── Task 8: 图片上传API (upload.js) ✅
├── Task 9: 报修订单API (orders.js) ✅
├── Task 10: 管理员API (admin.js) ✅
└── Task 11: 评价和公告API ✅

Phase 3: 前端核心页面 (Wave 5-6) ✅
├── Task 12: 登录/注册/找回密码页面 ✅
├── Task 13: 学生首页和报修页面 ✅
├── Task 14: 学生记录和评价页面 ✅
├── Task 15: 管理员首页 ✅
├── Task 16: 管理员订单处理页面 ✅
└── Task 17: 公告管理页面 ✅

Phase 4: 文档 (Wave 7) ✅
└── Task 18: 创建启动脚本和使用文档 ✅
```

---

## TODOs

### Phase 1: 基础设施

- [x] 1. 创建项目目录结构

  **Status**: ✅ Complete
  **What**: 创建server/和mini-program/目录结构
  **Acceptance Criteria**:
  - [x] 所有目录成功创建
  - [x] `ls -R dormitory-repair-system/` 显示完整目录树

---

- [x] 2. 初始化Node.js后端项目

  **Status**: ✅ Complete
  **What**: npm init, 安装依赖, 创建app.js和.env
  **Acceptance Criteria**:
  - [x] `server/package.json` 存在且包含所有依赖
  - [x] `server/app.js` 基础骨架完成
  - [x] `server/.env` 模板文件创建
  - [x] `npm install` 可成功运行

---

- [x] 3. 初始化微信小程序项目结构

  **Status**: ✅ Complete
  **What**: 创建pages目录, app.json, utils/request.js
  **Acceptance Criteria**:
  - [x] 所有页面目录和基础文件创建
  - [x] app.json 配置正确
  - [x] utils/request.js 封装完成

---

### Wave 2: 数据库和服务器配置

- [x] 4. 创建数据库和表结构

  **Status**: ✅ Complete
  **What**: 编写server/sql/init.sql，包含6张表
  **Acceptance Criteria**:
  - [x] `server/sql/init.sql` 文件创建
  - [x] 包含所有6张表的CREATE TABLE语句
  - [x] 包含索引定义和外键约束

---

- [x] 5. 配置Express服务器和中间件

  **Status**: ✅ Complete
  **What**: 完成app.js, database.js, response.js, auth.js, upload.js
  **Acceptance Criteria**:
  - [x] `server/app.js` 完整实现
  - [x] `server/config/database.js` 数据库连接池配置
  - [x] `server/utils/response.js` 响应工具函数
  - [x] `server/middleware/auth.js` JWT认证中间件
  - [x] `server/middleware/upload.js` 文件上传中间件

---

### Wave 3: 核心API实现 (认证、用户、上传)

- [x] 6. 实现认证API (注册/登录/找回密码)

  **Status**: ✅ Complete
  **What**: 创建 `server/routes/auth.js`
  **API Endpoints**:
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/reset-password
  **Acceptance Criteria**:
  - [x] 注册API创建用户成功
  - [x] 登录API返回有效JWT
  - [x] 找回密码可更新密码

---

- [x] 7. 实现用户管理API

  **Status**: ✅ Complete
  **What**: 创建 `server/routes/user.js`
  **Acceptance Criteria**:
  - [x] GET /api/user/profile - 获取用户信息
  - [x] PUT /api/user/profile - 更新用户信息
  - [x] PUT /api/user/password - 修改密码

---

- [x] 8. 实现图片上传API

  **Status**: ✅ Complete
  **What**: 创建 `server/routes/upload.js`
  **Acceptance Criteria**:
  - [x] POST /api/upload - 单图上传
  - [x] POST /api/upload/multiple - 多图上传
  - [x] 5MB大小限制
  - [x] 仅image/*类型

---

- [x] 9. 实现报修订单API (学生端)

  **Status**: ✅ Complete
  **What**: 创建 `server/routes/orders.js`
  **Acceptance Criteria**:
  - [x] POST /api/orders - 创建订单
  - [x] GET /api/orders - 订单列表
  - [x] GET /api/orders/:id - 订单详情
  - [x] PUT /api/orders/:id - 更新订单
  - [x] DELETE /api/orders/:id - 删除订单

---

- [x] 10. 实现管理员订单API

  **Status**: ✅ Complete
  **What**: 创建 `server/routes/admin.js`
  **Acceptance Criteria**:
  - [x] GET /api/admin/orders - 所有订单
  - [x] PUT /api/admin/orders/:id/status - 更新状态
  - [x] POST /api/admin/orders/:id/complete - 标记完成
  - [x] admin角色权限控制

---

- [x] 11. 实现评价和公告API

  **Status**: ✅ Complete
  **What**: 创建 `server/routes/evaluations.js` 和 `server/routes/announcements.js`
  **Acceptance Criteria**:
  - [x] 评价CRUD
  - [x] 公告CRUD

---

### Wave 4: 前端页面实现

- [x] 12. 开发登录/注册/找回密码页面

  **Status**: ✅ Complete
  **Files**: pages/index, pages/register, pages/forgot-password
  **Acceptance Criteria**:
  - [x] 登录表单功能完整
  - [x] 注册表单功能完整
  - [x] 找回密码功能完整

---

- [x] 13. 开发学生首页和报修页面

  **Status**: ✅ Complete
  **Files**: pages/student, pages/student-repair
  **Acceptance Criteria**:
  - [x] 学生首页功能入口
  - [x] 报修表单含图片上传
  - [x] WeUI组件使用

---

- [x] 14. 开发学生记录和评价页面

  **Status**: ✅ Complete
  **Files**: pages/student-records, pages/student-evaluation
  **Acceptance Criteria**:
  - [x] 订单列表展示
  - [x] 下拉刷新/上拉加载
  - [x] 评价功能完整

---

- [x] 15. 开发管理员首页

  **Status**: ✅ Complete
  **Files**: pages/admin
  **Acceptance Criteria**:
  - [x] 统计概览
  - [x] 功能入口

---

- [x] 16. 开发管理员订单处理页面

  **Status**: ✅ Complete
  **Files**: pages/admin-pending, pages/admin-completed
  **Acceptance Criteria**:
  - [x] 待处理订单列表
  - [x] 已完成订单列表
  - [x] 状态更新功能

---

- [x] 17. 开发公告管理页面

  **Status**: ✅ Complete
  **Files**: pages/admin-announcements, pages/admin-evaluations
  **Acceptance Criteria**:
  - [x] 公告CRUD
  - [x] 评价管理

---

- [x] 18. 创建启动脚本和使用文档

  **Status**: ✅ Complete
  **File**: README.md
  **Acceptance Criteria**:
  - [x] 项目介绍
  - [x] 快速开始指南
  - [x] API文档
  - [x] 部署说明

---

## Success Criteria

### 功能验证命令
```bash
# 1. 启动服务器
cd server && npm start

# 2. 健康检查
curl http://localhost:3000/health
# Expected: { "status": "OK" }

# 3. 完整流程测试
curl -X POST http://localhost:3000/api/auth/register \
  -d '{"username":"endtest","password":"123456","realName":"测试"}'

# 4. 运行测试
npm test
# Expected: All pass

# 5. 安全验证
mysql -e "SELECT password FROM users WHERE username='endtest'"
# Expected: starts with '$2b$' (bcrypt)
```

### 最终检查清单
- [x] 学生可提交报修（含图片）
- [x] 管理员可处理订单
- [x] 密码以bcrypt格式存储
- [x] JWT_SECRET非默认值
- [x] 所有API已实现

---

**计划生成时间**: 2026-02-14
**完成时间**: 2026-02-14
**总任务数**: 18
**完成任务数**: 18 ✅
