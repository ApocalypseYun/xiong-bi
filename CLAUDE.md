# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

宿舍报修系统 (Dormitory Repair Management System) — a WeChat Mini Program frontend with a Node.js/Express backend and MySQL database.

## Commands

### Backend (run from `server/`)
```bash
npm start        # Production: node app.js
npm run dev      # Development: nodemon app.js (auto-reload)
```

### Database Setup
```bash
# Initialize schema (from MySQL client)
source server/sql/init.sql
```

### Frontend
Open `mini-program/` directory in WeChat Developer Tools. No build step required.

## Architecture

### Repository Layout
```
server/           # Express backend
  app.js          # Entry point, mounts all routes under /api
  config/         # MySQL connection pool (mysql2/promise)
  controllers/    # Business logic
  routes/         # Route definitions
  middleware/     # auth.js (JWT), upload.js (multer)
  utils/          # Response formatting helpers
  public/images/  # Uploaded file storage (served as /images)
  sql/init.sql    # Schema + seed data
  __tests__/      # Tests

mini-program/     # WeChat Mini Program
  app.js          # App init, globalData: { userInfo, token }
  utils/request.js  # HTTP client (BASE_URL: http://localhost:3000/api)
  utils/storage.js  # wx.storage helpers
  pages/          # 13 pages (index, register, student*, admin*)
```

### Request Flow
1. Mini Program → `utils/request.js` auto-attaches JWT from globalData
2. Express `app.js` → routes → `authenticate` middleware validates JWT → controller
3. `authorize(roles)` middleware enforces role-based access (`student` / `super_admin`)

### Order Lifecycle
```
pending → processing → completed
(student submits)  (admin accepts)  (admin uploads proof + closes)
```
Evaluations become available only after `completed` status.

### Database Tables
- `users` — roles: `student`, `super_admin`
- `repairOrders` — status: `pending`, `processing`, `completed`
- `orderImages` — problem photos (cascade delete with order)
- `completionImages` — repair proof photos
- `evaluations` — one per order, rating 1-5
- `announcements` — admin-managed, `isActive` toggle

### File Uploads
- Multer stores files in `server/public/images/`
- Served statically at `/images/<filename>`
- URL constructed as `http://host:port/images/{filename}` in upload controller
- Max 5MB per file, images only

## Environment Configuration

`server/.env` (required):
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=<password>
DB_NAME=dormitory_repair
PORT=3000
JWT_SECRET=<secret>
```

## Test Credentials (from init.sql seed data)
- Admin: `admin` / `admin123`
- Student: `2024001` / `123456`

## Key Conventions
- All API responses use `utils/response.js` helpers for consistent `{ success, data, message }` shape
- JWT is passed as `Authorization: Bearer <token>` header
- WeChat Mini Program AppID: `wxf03fbf7952589990`
- `urlCheck: false` in DevTools config — domain validation disabled for local dev
