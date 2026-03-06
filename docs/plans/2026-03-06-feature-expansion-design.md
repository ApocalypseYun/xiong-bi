# 功能扩展设计文档

**日期**: 2026-03-06
**项目**: 宿舍报修系统

---

## 背景

在现有系统（学生报修 + 超级管理员处理）基础上，扩展以下功能：
1. 住户预置表 + 注册核验
2. 维修工角色（管理员手动添加，自主接单）
3. 超级管理员扩展（住户管理、维修工管理、只读查看订单）
4. 报修单催促功能（>6h 未响应）
5. 报修单撤回功能（pending 状态可撤回）
6. 双向评价（用户评价后维修工可反向评价）

---

## 一、数据库变更

### 新增：`residents`（住户预置表）

```sql
CREATE TABLE residents (
  residentId   INT PRIMARY KEY AUTO_INCREMENT,
  studentId    VARCHAR(50) UNIQUE NOT NULL,   -- 学号
  name         VARCHAR(50) NOT NULL,           -- 姓名
  phone        VARCHAR(20) NOT NULL,           -- 手机号
  building     VARCHAR(50) NOT NULL,           -- 栋数
  roomNumber   VARCHAR(50) NOT NULL,           -- 寝室号
  qqEmail      VARCHAR(100) NOT NULL,          -- QQ邮箱（仅格式校验）
  isRegistered BOOLEAN DEFAULT FALSE,          -- 是否已注册账号
  createdAt    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 修改：`users`

- ENUM 改为 `ENUM('student', 'repairman', 'super_admin')`

### 修改：`repairOrders`

新增字段：
- `status` ENUM 增加 `'withdrawn'`
- `repairmanId` INT NULL FK→users（接单维修工）
- `lastUrgedAt` DATETIME NULL（最后催促时间）
- `urgeCount` INT DEFAULT 0（累计催促次数）

### 修改：`evaluations`

新增双向评价字段：
- `repairmanRating` INT NULL CHECK(1-5)
- `repairmanComment` TEXT NULL
- `repairmanEvaluatedAt` DATETIME NULL

---

## 二、后端架构

### 新增路由模块

#### `/api/repairman`（role=repairman）

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /orders/pending | 待接单列表 |
| GET | /orders/mine | 我的进行中订单 |
| PUT | /orders/:id/accept | 接单 (pending→processing) |
| PUT | /orders/:id/complete | 完成 (processing→completed) |
| POST | /evaluations/:orderId | 对用户反向评价（用户已评后可用） |

#### `/api/admin/residents`（role=super_admin）

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | / | 住户列表（?studentId=搜索） |
| POST | / | 新增住户 |
| PUT | /:id | 编辑住户 |
| DELETE | /:id | 删除住户 |
| POST | /import | Excel 批量导入（xlsx 库） |

#### `/api/admin/repairmen`（role=super_admin）

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | / | 维修工列表 |
| POST | / | 新增维修工账号 |
| PUT | /:id | 编辑（姓名/手机/密码） |
| DELETE | /:id | 删除维修工账号 |

### 修改现有路由

| 路由 | 变更 |
|------|------|
| `POST /api/auth/register` | 注册前核对 residents 表 6 字段（studentId/name/phone/building/roomNumber/qqEmail），成功后标记 isRegistered=true |
| `POST /api/auth/reset-password` | 同样核对 residents 6 字段才允许重置密码 |
| `GET /api/admin/orders` | 保留只读，移除 accept/complete 操作 |
| `DELETE /api/admin/orders/:id/accept` | 移除（迁移至 repairman 路由） |
| `DELETE /api/admin/orders/:id/complete` | 移除（迁移至 repairman 路由） |
| `POST /api/orders/:id/urge` | 新增：学生催促，校验 pending>6h |
| `DELETE /api/orders/:id` | 新增：学生撤回 pending 订单（status→withdrawn） |

### 权限矩阵

| 操作 | student | repairman | super_admin |
|------|---------|-----------|-------------|
| 提交报单 | ✓ | — | — |
| 撤回报单（pending） | ✓ | — | — |
| 催促（>6h pending） | ✓ | — | — |
| 接单 / 完成 | — | ✓ | — |
| 反向评价用户 | — | ✓ | — |
| 查看所有订单 | — | — | ✓（只读） |
| 管理住户表 | — | — | ✓ |
| 管理维修工账号 | — | — | ✓ |

---

## 三、小程序页面

### 新增页面

| 路径 | 角色 | 功能描述 |
|------|------|----------|
| `pages/repairman/repairman` | 维修工 | 仪表盘：待接单数/进行中/我的完成数 |
| `pages/repairman-orders/repairman-orders` | 维修工 | 待接单列表（接单操作） |
| `pages/repairman-active/repairman-active` | 维修工 | 进行中订单（上传凭证/完成） |
| `pages/admin-residents/admin-residents` | 超管 | 住户管理（搜索/增删改/Excel导入） |
| `pages/admin-repairmen/admin-repairmen` | 超管 | 维修工账号管理（增删改） |

### 修改现有页面

| 页面 | 变更 |
|------|------|
| `pages/register` | 新增 qqEmail 字段，注册逻辑核对住户表 |
| `pages/forgot-password` | 改为核对住户表 6 字段后重置密码 |
| `pages/student-records` | pending 订单显示「撤回」按钮；pending>6h 显示「催促」（否则显示剩余时间） |
| `pages/admin` | 新增催促提醒角标、住户管理入口、维修工管理入口 |
| `pages/admin-pending` | 只读显示，无接单按钮 |
| `pages/student-evaluation` | 学生评价后，维修工订单详情页显示「评价用户」按钮 |

### 登录跳转

```
student    → /pages/student/student
repairman  → /pages/repairman/repairman（新建）
super_admin → /pages/admin/admin
```

---

## 四、关键业务流程

### 注册流程
1. 用户填写：学号、姓名、手机号、栋数、寝室号、QQ邮箱、密码
2. 后端核对 residents 表，6 字段全部匹配且 isRegistered=false
3. 创建 users 记录，更新 residents.isRegistered=true

### 催促流程
1. 用户查看待处理订单，订单提交超过 6 小时且 status=pending
2. 点击「催促」→ 后端记录 lastUrgedAt、urgeCount+1
3. 超管首页展示有催促的订单数，点进查看

### 撤回流程
1. 用户在订单列表点击「撤回」（仅 pending 状态可见）
2. 后端确认 status=pending 且 userId 匹配
3. status 更新为 withdrawn

### 双向评价流程
1. 订单 completed，学生提交评价（rating+comment）
2. 维修工在订单详情页看到「评价用户」按钮（仅在学生已评后出现）
3. 维修工提交 repairmanRating+repairmanComment
4. evaluations 表更新对应字段

---

## 五、技术依赖

- Excel 导入：`npm install xlsx`（后端解析 .xlsx/.xls 文件）
- 其余依赖不变（Express、mysql2、bcryptjs、jsonwebtoken、multer）
