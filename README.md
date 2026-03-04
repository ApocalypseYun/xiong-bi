# 宿舍报修系统

一个基于微信小程序的宿舍报修管理系统，支持学生提交报修申请、管理员处理工单、服务评价等功能。

## 技术栈

- **前端**: 微信小程序
- **后端**: Node.js + Express
- **数据库**: MySQL
- **文件存储**: 本地存储

## 项目结构

```
xiong-bi/
├── server/                 # 后端服务
│   ├── app.js             # 应用入口
│   ├── config/            # 配置文件
│   ├── controllers/       # 控制器
│   ├── middleware/        # 中间件
│   ├── routes/            # 路由
│   ├── sql/               # 数据库初始化脚本
│   ├── public/            # 静态资源（图片上传目录）
│   └── utils/             # 工具函数
└── mini-program/          # 微信小程序
    ├── pages/             # 页面
    ├── utils/             # 工具函数
    └── app.js             # 小程序入口
```

## 快速开始

### 环境要求

- Node.js >= 14.0.0
- MySQL >= 5.7
- 微信开发者工具（稳定版）

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 数据库配置

创建 `.env` 文件（在 `server/` 目录下）：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=dormitory_repair
PORT=3000
JWT_SECRET=your_jwt_secret_key
```

### 3. 初始化数据库

```bash
# 先创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dormitory_repair CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 导入表结构和初始数据
mysql -u root -p dormitory_repair < sql/init.sql
```

### 4. 启动后端服务

```bash
cd server
node app.js
```

服务将在 http://localhost:3000 启动

### 5. 配置微信小程序

1. 打开微信开发者工具
2. 导入 `mini-program` 目录
3. 在 **详情 → 本地设置** 中勾选「不校验合法域名」
4. 确认 `mini-program/utils/request.js` 中 `BASE_URL` 为 `http://localhost:3000/api`
5. 清除缓存后重新编译

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 学生 | 2024001 | 123456 |

## 功能特性

### 学生端
- 📝 提交报修申请（支持图片上传）
- 📋 查看报修记录和进度
- ⭐ 评价维修服务
- 📢 查看系统公告

### 管理员端
- 📋 待处理订单列表（接单/完成）
- ✅ 已完成订单查询（支持日期筛选）
- ⭐ 查看用户评价
- 📢 发布和管理公告

## 订单状态流程

```
pending（待处理）→ processing（处理中）→ completed（已完成）
      ↑                  ↑                    ↑
   学生提交           管理员接单           上传完成凭证
```

## API 端点

### 认证 `/api/auth`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /login | 用户登录 |
| POST | /register | 用户注册 |
| POST | /reset-password | 重置密码 |

### 订单 `/api/orders`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 获取我的报修列表 |
| GET | /:id | 获取报修详情 |
| POST | / | 创建报修单 |

### 管理员 `/api/admin`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /orders/pending | 获取待处理订单 |
| GET | /orders | 获取所有订单（支持日期筛选）|
| PUT | /orders/:id/accept | 接单 |
| PUT | /orders/:id/complete | 完成订单 |

### 评价 `/api/evaluations`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin | 管理员查看所有评价 |
| POST | / | 创建评价 |
| GET | /order/:orderId | 获取指定订单的评价 |

### 公告 `/api/announcements`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 获取公告列表 |
| POST | /admin | 创建公告（管理员）|
| PUT | /admin/:id | 更新公告（管理员）|
| DELETE | /admin/:id | 删除公告（管理员）|

### 文件上传 `/api/upload`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /image | 上传报修图片 |
| POST | /completion | 上传完成凭证 |

## 常见问题

**Q: 小程序报 `Foundation.onLoad is not a function` 错误？**

A: 这是微信开发者工具版本兼容问题。解决方案：
1. 使用稳定版开发者工具
2. 或在 `project.config.json` 中设置 `"enhance": false`

**Q: 登录报 401 Unauthorized？**

A: 确保 `mini-program/utils/request.js` 中 Authorization 格式为 `Bearer ${token}`

**Q: 图片上传失败？**

A: 确保 `server/public/images` 目录存在且有写入权限：
```bash
mkdir -p server/public/images
```

**Q: 数据库连接失败？**

A: 检查 `.env` 文件中的数据库密码是否正确，确保 MySQL 服务已启动。

## 许可证

MIT
