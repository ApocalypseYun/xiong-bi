# 宿舍报修系统

一个基于微信小程序的宿舍报修管理系统。

## 技术栈

- **前端**: 微信小程序
- **后端**: Node.js + Express
- **数据库**: MySQL
- **文件存储**: 本地存储

## 项目结构

```
dormitory-repair-system/
├── server/                 # 后端服务
│   ├── app.js             # 应用入口
│   ├── config/            # 配置文件
│   ├── controllers/       # 控制器
│   ├── middleware/        # 中间件
│   ├── routes/            # 路由
│   ├── sql/               # 数据库初始化脚本
│   └── utils/             # 工具函数
└── mini-program/          # 微信小程序
```

## 安装步骤

### 环境要求

- Node.js >= 14.0.0
- MySQL >= 5.7
- 微信开发者工具

### 后端安装

```bash
cd dormitory-repair-system/server
npm install
```

### 数据库配置

1. 创建 MySQL 数据库
2. 导入数据库结构：
```bash
mysql -u root -p < sql/init.sql
```

### 环境变量配置

复制 `.env` 文件并修改配置：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=dormitory_repair
PORT=3000
JWT_SECRET=your_jwt_secret
```

### 启动服务

```bash
npm start
```

服务将在 http://localhost:3000 启动

### 小程序配置

1. 打开微信开发者工具
2. 导入 `dormitory-repair-system/mini-program` 目录
3. 在"详情" -> "本地设置"中勾选"不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书"
4. 修改 `mini-program/utils/request.js` 中的 `BASE_URL` 为你的服务器地址
5. 运行项目

## 测试账号

| 角色 | 学号/工号 | 密码 |
|------|-----------|------|
| 管理员 | admin | admin123 |
| 学生 | 2024001 | 123456 |
| 学生 | 2024002 | 123456 |

## API 端点

### 认证相关 `/api/auth`
- `POST /login` - 用户登录
- `POST /register` - 用户注册

### 用户相关 `/api/user`
- `GET /profile` - 获取用户信息
- `PUT /profile` - 更新用户信息

### 报修相关 `/api/orders`
- `GET /` - 获取报修列表
- `GET /:id` - 获取报修详情
- `POST /` - 创建报修
- `PUT /:id` - 更新报修状态
- `PUT /:id/assign` - 指派维修人员

### 管理相关 `/api/admin`
- `GET /users` - 获取用户列表
- `GET /stats` - 获取统计数据
- `GET /dormitories` - 获取宿舍列表

### 评价相关 `/api/evaluations`
- `GET /` - 获取评价列表
- `POST /` - 创建评价
- `GET /order/:orderId` - 获取指定报修的评价

### 公告相关 `/api/announcements`
- `GET /` - 获取公告列表
- `GET /:id` - 获取公告详情

### 文件上传 `/api/upload`
- `POST /image` - 上传图片

## 功能特性

### 学生端
- 提交报修申请
- 查看报修进度
- 评价维修服务
- 查看系统公告

### 管理员端
- 管理报修工单
- 指派维修人员
- 用户管理
- 系统公告管理
- 数据统计

## 开发说明

### 添加新路由

1. 在 `server/routes/` 创建路由文件
2. 在 `server/controllers/` 创建对应控制器
3. 在 `server/app.js` 中挂载路由

### 数据库迁移

修改 `server/sql/init.sql` 后重新导入数据库。

## 常见问题

**Q: 小程序无法连接后端？**
A: 确保后端服务已启动，并检查小程序中的 BASE_URL 配置是否正确。

**Q: 图片上传失败？**
A: 确保 `server/public/images` 目录存在且有写入权限。

## 许可证

MIT
