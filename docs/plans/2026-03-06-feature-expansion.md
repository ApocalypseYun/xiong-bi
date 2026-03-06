# Feature Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add resident validation, repairman role, admin management pages, order urge/withdraw, and bidirectional evaluation to the dormitory repair system.

**Architecture:** Backend adds new Express route modules (`/api/repairman`, `/api/admin/residents`, `/api/admin/repairmen`) and updates auth routes to validate against a pre-loaded `residents` table. Mini-program gets 5 new pages and several updated pages. Existing `adminController` `acceptOrder`/`completeOrder` logic is migrated to a new `repairmanController`.

**Tech Stack:** Node.js/Express 5, MySQL (mysql2/promise), bcryptjs, JWT, multer, xlsx (new), WeChat Mini Program vanilla JS

---

## Phase 1: Database

### Task 1: Create migration SQL script

**Files:**
- Create: `server/sql/migrate_v2.sql`

**Step 1: Create the migration file**

```sql
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
  createdAt    DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_studentId (studentId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. users 表 ENUM 增加 repairman
ALTER TABLE users MODIFY COLUMN role ENUM('student', 'repairman', 'super_admin') DEFAULT 'student';

-- 3. repairOrders 新增字段
ALTER TABLE repairOrders MODIFY COLUMN status ENUM('pending', 'processing', 'completed', 'withdrawn') DEFAULT 'pending';
ALTER TABLE repairOrders ADD COLUMN IF NOT EXISTS repairmanId INT NULL;
ALTER TABLE repairOrders ADD COLUMN IF NOT EXISTS lastUrgedAt DATETIME NULL;
ALTER TABLE repairOrders ADD COLUMN IF NOT EXISTS urgeCount INT NOT NULL DEFAULT 0;
ALTER TABLE repairOrders ADD CONSTRAINT fk_repairmanId FOREIGN KEY (repairmanId) REFERENCES users(userId);

-- 4. evaluations 新增双向评价字段
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS repairmanRating INT NULL;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS repairmanComment TEXT NULL;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS repairmanEvaluatedAt DATETIME NULL;

-- 5. 测试住户数据（与 init.sql 测试学生对应）
INSERT IGNORE INTO residents (studentId, name, phone, building, roomNumber, qqEmail)
VALUES ('2024001', '张三', '13800000000', 'A栋', '101', '123456789@qq.com');
```

**Step 2: Run migration**

```bash
cd /path/to/project/server
mysql -u root -p dormitory_repair < sql/migrate_v2.sql
```

Expected: no errors

**Step 3: Verify**

```bash
mysql -u root -p dormitory_repair -e "SHOW TABLES; SHOW COLUMNS FROM residents; SHOW COLUMNS FROM repairOrders;"
```

Expected: `residents` table appears, `repairOrders` has `repairmanId`, `lastUrgedAt`, `urgeCount` columns.

**Step 4: Also update init.sql so fresh installs work**

Add the `residents` table and ALTER statements to `server/sql/init.sql` after the existing CREATE TABLE blocks, so fresh database setup also works.

**Step 5: Commit**

```bash
git add server/sql/
git commit -m "feat: database migration v2 - residents table, repairman role, urge/withdraw/bidirectional-eval fields"
```

---

## Phase 2: Backend

### Task 2: Install xlsx dependency

**Files:**
- Modify: `server/package.json`

**Step 1: Install**

```bash
cd server
npm install xlsx
```

**Step 2: Verify**

```bash
node -e "const XLSX = require('xlsx'); console.log('xlsx ok', XLSX.version)"
```

Expected: prints `xlsx ok 0.x.x`

**Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "feat: add xlsx dependency for Excel import"
```

---

### Task 3: Resident management controller

**Files:**
- Create: `server/controllers/residentController.js`

**Step 1: Write the controller**

```javascript
// server/controllers/residentController.js
const pool = require('../config/database');
const { success, error } = require('../utils/response');
const XLSX = require('xlsx');

// 获取住户列表（支持按学号搜索）
const getResidents = async (req, res) => {
  try {
    const { studentId } = req.query;
    let sql = 'SELECT * FROM residents';
    const params = [];
    if (studentId) {
      sql += ' WHERE studentId LIKE ?';
      params.push(`%${studentId}%`);
    }
    sql += ' ORDER BY createdAt DESC';
    const [rows] = await pool.execute(sql, params);
    return success(res, rows, '获取住户列表成功');
  } catch (err) {
    console.error('获取住户列表错误:', err);
    return error(res, '获取住户列表失败', 500);
  }
};

// 新增住户
const createResident = async (req, res) => {
  try {
    const { studentId, name, phone, building, roomNumber, qqEmail } = req.body;
    if (!studentId || !name || !phone || !building || !roomNumber || !qqEmail) {
      return error(res, '所有字段均为必填', 400);
    }
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailReg.test(qqEmail)) {
      return error(res, '邮箱格式不正确', 400);
    }
    const [exist] = await pool.execute('SELECT residentId FROM residents WHERE studentId = ?', [studentId]);
    if (exist.length > 0) {
      return error(res, '该学号已存在', 400);
    }
    const [result] = await pool.execute(
      'INSERT INTO residents (studentId, name, phone, building, roomNumber, qqEmail) VALUES (?, ?, ?, ?, ?, ?)',
      [studentId, name, phone, building, roomNumber, qqEmail]
    );
    return success(res, { residentId: result.insertId }, '添加住户成功');
  } catch (err) {
    console.error('添加住户错误:', err);
    return error(res, '添加住户失败', 500);
  }
};

// 编辑住户
const updateResident = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, building, roomNumber, qqEmail } = req.body;
    const [exist] = await pool.execute('SELECT residentId FROM residents WHERE residentId = ?', [id]);
    if (exist.length === 0) return error(res, '住户不存在', 404);
    await pool.execute(
      'UPDATE residents SET name=?, phone=?, building=?, roomNumber=?, qqEmail=? WHERE residentId=?',
      [name, phone, building, roomNumber, qqEmail, id]
    );
    return success(res, null, '更新住户成功');
  } catch (err) {
    console.error('更新住户错误:', err);
    return error(res, '更新住户失败', 500);
  }
};

// 删除住户
const deleteResident = async (req, res) => {
  try {
    const { id } = req.params;
    const [exist] = await pool.execute('SELECT residentId, isRegistered FROM residents WHERE residentId = ?', [id]);
    if (exist.length === 0) return error(res, '住户不存在', 404);
    if (exist[0].isRegistered) return error(res, '该住户已注册账号，无法删除', 400);
    await pool.execute('DELETE FROM residents WHERE residentId = ?', [id]);
    return success(res, null, '删除住户成功');
  } catch (err) {
    console.error('删除住户错误:', err);
    return error(res, '删除住户失败', 500);
  }
};

// Excel 批量导入
const importResidents = async (req, res) => {
  try {
    if (!req.file) return error(res, '请上传 Excel 文件', 400);
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    // 期望列: 学号、姓名、手机号、栋数、寝室号、QQ邮箱
    const required = ['学号', '姓名', '手机号', '栋数', '寝室号', 'QQ邮箱'];
    if (rows.length === 0) return error(res, 'Excel 文件为空', 400);
    const firstRow = rows[0];
    for (const col of required) {
      if (!(col in firstRow)) return error(res, `Excel 缺少列: ${col}`, 400);
    }
    let inserted = 0, skipped = 0;
    for (const row of rows) {
      const { 学号: studentId, 姓名: name, 手机号: phone, 栋数: building, 寝室号: roomNumber, 'QQ邮箱': qqEmail } = row;
      if (!studentId || !name || !phone || !building || !roomNumber || !qqEmail) { skipped++; continue; }
      const [exist] = await pool.execute('SELECT residentId FROM residents WHERE studentId = ?', [String(studentId)]);
      if (exist.length > 0) { skipped++; continue; }
      await pool.execute(
        'INSERT INTO residents (studentId, name, phone, building, roomNumber, qqEmail) VALUES (?, ?, ?, ?, ?, ?)',
        [String(studentId), String(name), String(phone), String(building), String(roomNumber), String(qqEmail)]
      );
      inserted++;
    }
    return success(res, { inserted, skipped }, `导入完成：成功 ${inserted} 条，跳过 ${skipped} 条`);
  } catch (err) {
    console.error('导入住户错误:', err);
    return error(res, '导入失败', 500);
  }
};

module.exports = { getResidents, createResident, updateResident, deleteResident, importResidents };
```

**Step 2: Create resident routes**

Create `server/routes/residents.js`:

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getResidents, createResident, updateResident, deleteResident, importResidents
} = require('../controllers/residentController');

const memUpload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.use(authorize(['super_admin']));

router.get('/', getResidents);
router.post('/', createResident);
router.put('/:id', updateResident);
router.delete('/:id', deleteResident);
router.post('/import', memUpload.single('file'), importResidents);

module.exports = router;
```

**Step 3: Register route in app.js**

In `server/app.js`, add after existing routes:

```javascript
app.use('/api/admin/residents', require('./routes/residents'));
```

**Step 4: Manual test**

Start server: `npm run dev`

```bash
# Test GET residents (empty)
curl -H "Authorization: Bearer <admin_token>" http://localhost:3000/api/admin/residents

# Test POST resident
curl -X POST -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"2024002","name":"李四","phone":"13900000000","building":"B栋","roomNumber":"202","qqEmail":"999@qq.com"}' \
  http://localhost:3000/api/admin/residents
```

Expected: `{"code":200,"message":"添加住户成功",...}`

**Step 5: Commit**

```bash
git add server/controllers/residentController.js server/routes/residents.js server/app.js
git commit -m "feat: add resident management API (CRUD + Excel import)"
```

---

### Task 4: Admin repairman management controller

**Files:**
- Create: `server/controllers/adminRepairmanController.js`
- Create: `server/routes/adminRepairmen.js`

**Step 1: Write the controller**

```javascript
// server/controllers/adminRepairmanController.js
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { success, error } = require('../utils/response');

// 获取维修工列表
const getRepairmen = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT userId, username, realName, phone, createdAt FROM users WHERE role = 'repairman' ORDER BY createdAt DESC"
    );
    return success(res, rows, '获取维修工列表成功');
  } catch (err) {
    console.error('获取维修工列表错误:', err);
    return error(res, '获取维修工列表失败', 500);
  }
};

// 新增维修工
const createRepairman = async (req, res) => {
  try {
    const { username, password, realName, phone } = req.body;
    if (!username || !password || !realName || !phone) {
      return error(res, '用户名、密码、姓名、手机号均为必填', 400);
    }
    if (password.length < 6) return error(res, '密码不能少于6位', 400);
    const [exist] = await pool.execute('SELECT userId FROM users WHERE username = ?', [username]);
    if (exist.length > 0) return error(res, '用户名已存在', 400);
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (username, password, role, realName, phone) VALUES (?, ?, 'repairman', ?, ?)",
      [username, hashed, realName, phone]
    );
    return success(res, { userId: result.insertId }, '添加维修工成功');
  } catch (err) {
    console.error('添加维修工错误:', err);
    return error(res, '添加维修工失败', 500);
  }
};

// 编辑维修工
const updateRepairman = async (req, res) => {
  try {
    const { id } = req.params;
    const { realName, phone, password } = req.body;
    const [exist] = await pool.execute("SELECT userId FROM users WHERE userId = ? AND role = 'repairman'", [id]);
    if (exist.length === 0) return error(res, '维修工不存在', 404);
    if (password) {
      if (password.length < 6) return error(res, '密码不能少于6位', 400);
      const hashed = await bcrypt.hash(password, 10);
      await pool.execute('UPDATE users SET realName=?, phone=?, password=? WHERE userId=?', [realName, phone, hashed, id]);
    } else {
      await pool.execute('UPDATE users SET realName=?, phone=? WHERE userId=?', [realName, phone, id]);
    }
    return success(res, null, '更新维修工成功');
  } catch (err) {
    console.error('更新维修工错误:', err);
    return error(res, '更新维修工失败', 500);
  }
};

// 删除维修工
const deleteRepairman = async (req, res) => {
  try {
    const { id } = req.params;
    const [exist] = await pool.execute("SELECT userId FROM users WHERE userId = ? AND role = 'repairman'", [id]);
    if (exist.length === 0) return error(res, '维修工不存在', 404);
    await pool.execute('DELETE FROM users WHERE userId = ?', [id]);
    return success(res, null, '删除维修工成功');
  } catch (err) {
    console.error('删除维修工错误:', err);
    return error(res, '删除维修工失败', 500);
  }
};

module.exports = { getRepairmen, createRepairman, updateRepairman, deleteRepairman };
```

**Step 2: Write the route**

```javascript
// server/routes/adminRepairmen.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getRepairmen, createRepairman, updateRepairman, deleteRepairman } = require('../controllers/adminRepairmanController');

router.use(authenticate);
router.use(authorize(['super_admin']));

router.get('/', getRepairmen);
router.post('/', createRepairman);
router.put('/:id', updateRepairman);
router.delete('/:id', deleteRepairman);

module.exports = router;
```

**Step 3: Register in app.js**

```javascript
app.use('/api/admin/repairmen', require('./routes/adminRepairmen'));
```

**Step 4: Manual test**

```bash
# Create repairman
curl -X POST -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"worker01","password":"123456","realName":"王五","phone":"13700000000"}' \
  http://localhost:3000/api/admin/repairmen
```

**Step 5: Commit**

```bash
git add server/controllers/adminRepairmanController.js server/routes/adminRepairmen.js server/app.js
git commit -m "feat: add admin repairman management API"
```

---

### Task 5: Update auth – register with resident validation

**Files:**
- Modify: `server/controllers/authController.js`

**Step 1: Replace the register function**

The `register` function currently only checks `username` uniqueness. Replace it to:
1. Accept `studentId` as `username`
2. Validate all 6 fields against `residents` table
3. Mark `isRegistered = true` after successful registration

Replace the `register` function body in `server/controllers/authController.js`:

```javascript
const register = async (req, res) => {
  try {
    const { username, password, confirmPassword, realName, phone, roomNumber, building, qqEmail } = req.body;

    if (!username || !password || !confirmPassword || !realName || !phone || !roomNumber || !building || !qqEmail) {
      return error(res, '所有字段均为必填', 400);
    }
    if (password !== confirmPassword) return error(res, '两次输入的密码不一致', 400);
    if (password.length < 6) return error(res, '密码长度不能少于6位', 400);

    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailReg.test(qqEmail)) return error(res, 'QQ邮箱格式不正确', 400);

    // 核对住户表（学号即用户名）
    const [residents] = await pool.execute(
      'SELECT residentId, isRegistered FROM residents WHERE studentId=? AND name=? AND phone=? AND building=? AND roomNumber=? AND qqEmail=?',
      [username, realName, phone, building, roomNumber, qqEmail]
    );
    if (residents.length === 0) return error(res, '个人信息与住户记录不匹配，请核对后重试', 400);
    if (residents[0].isRegistered) return error(res, '该学号已注册账号', 400);

    // 检查 users 表是否重复
    const [existingUsers] = await pool.execute('SELECT userId FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) return error(res, '用户名已存在', 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, role, realName, phone, roomNumber, building) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, 'student', realName, phone, roomNumber, building]
    );

    // 标记住户已注册
    await pool.execute('UPDATE residents SET isRegistered = TRUE WHERE residentId = ?', [residents[0].residentId]);

    return success(res, { userId: result.insertId, username, role: 'student' }, '注册成功');
  } catch (err) {
    console.error('注册错误:', err);
    return error(res, '注册失败，请稍后重试', 500);
  }
};
```

**Step 2: Replace resetPassword function to also validate against residents**

```javascript
const resetPassword = async (req, res) => {
  try {
    const { username, realName, phone, building, roomNumber, qqEmail, newPassword, confirmPassword } = req.body;

    if (!username || !realName || !phone || !building || !roomNumber || !qqEmail || !newPassword || !confirmPassword) {
      return error(res, '所有字段均为必填', 400);
    }
    if (newPassword !== confirmPassword) return error(res, '两次输入的密码不一致', 400);
    if (newPassword.length < 6) return error(res, '密码长度不能少于6位', 400);

    // 核对住户表
    const [residents] = await pool.execute(
      'SELECT residentId FROM residents WHERE studentId=? AND name=? AND phone=? AND building=? AND roomNumber=? AND qqEmail=?',
      [username, realName, phone, building, roomNumber, qqEmail]
    );
    if (residents.length === 0) return error(res, '个人信息与住户记录不匹配', 400);

    const [users] = await pool.execute('SELECT userId FROM users WHERE username = ?', [username]);
    if (users.length === 0) return error(res, '该学号尚未注册账号', 404);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username]);

    return success(res, null, '密码重置成功');
  } catch (err) {
    console.error('密码重置错误:', err);
    return error(res, '密码重置失败，请稍后重试', 500);
  }
};
```

**Step 3: Manual test**

First add a resident, then try to register:

```bash
# Try register with wrong info (should fail)
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"2024001","password":"123456","confirmPassword":"123456","realName":"错误姓名","phone":"13800000000","building":"A栋","roomNumber":"101","qqEmail":"123456789@qq.com"}' \
  http://localhost:3000/api/auth/register
# Expected: 400 "个人信息与住户记录不匹配"

# Register with correct info
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"2024001","password":"newpass123","confirmPassword":"newpass123","realName":"张三","phone":"13800000000","building":"A栋","roomNumber":"101","qqEmail":"123456789@qq.com"}' \
  http://localhost:3000/api/auth/register
# Expected: 200 注册成功
```

**Step 4: Commit**

```bash
git add server/controllers/authController.js
git commit -m "feat: register and reset-password now validate against residents table"
```

---

### Task 6: Repairman work routes (accept/complete order)

**Files:**
- Create: `server/controllers/repairmanController.js`
- Create: `server/routes/repairman.js`

**Step 1: Write the repairman controller**

```javascript
// server/controllers/repairmanController.js
const pool = require('../config/database');
const { success, error } = require('../utils/response');

// 获取所有待接单订单
const getPendingOrders = async (req, res) => {
  try {
    const [orders] = await pool.execute(`
      SELECT o.orderId, o.repairType, o.building, o.roomNumber, o.contactPhone,
             o.description, o.status, o.createdAt, o.urgeCount, o.lastUrgedAt,
             u.realName as userRealName
      FROM repairOrders o
      LEFT JOIN users u ON o.userId = u.userId
      WHERE o.status = 'pending'
      ORDER BY o.urgeCount DESC, o.createdAt ASC
    `);
    for (const order of orders) {
      const [images] = await pool.execute('SELECT imageUrl FROM orderImages WHERE orderId = ?', [order.orderId]);
      order.images = images;
    }
    return success(res, orders, '获取待接单列表成功');
  } catch (err) {
    console.error('获取待接单错误:', err);
    return error(res, '获取待接单列表失败', 500);
  }
};

// 获取我的进行中订单
const getMyOrders = async (req, res) => {
  try {
    const repairmanId = req.user.userId;
    const [orders] = await pool.execute(`
      SELECT o.orderId, o.repairType, o.building, o.roomNumber, o.contactPhone,
             o.description, o.status, o.createdAt,
             u.realName as userRealName
      FROM repairOrders o
      LEFT JOIN users u ON o.userId = u.userId
      WHERE o.repairmanId = ? AND o.status IN ('processing', 'completed')
      ORDER BY o.createdAt DESC
    `, [repairmanId]);
    for (const order of orders) {
      const [images] = await pool.execute('SELECT imageUrl FROM orderImages WHERE orderId = ?', [order.orderId]);
      order.images = images;
      if (order.status === 'completed') {
        const [ci] = await pool.execute('SELECT imageUrl FROM completionImages WHERE orderId = ?', [order.orderId]);
        order.completionImages = ci;
      }
    }
    return success(res, orders, '获取我的订单成功');
  } catch (err) {
    console.error('获取我的订单错误:', err);
    return error(res, '获取我的订单失败', 500);
  }
};

// 接单
const acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const repairmanId = req.user.userId;
    const [orders] = await pool.execute('SELECT orderId, status FROM repairOrders WHERE orderId = ?', [id]);
    if (orders.length === 0) return error(res, '订单不存在', 404);
    if (orders[0].status !== 'pending') return error(res, '该订单已被接单或已完成', 400);
    await pool.execute(
      'UPDATE repairOrders SET status = ?, repairmanId = ? WHERE orderId = ?',
      ['processing', repairmanId, id]
    );
    return success(res, { orderId: parseInt(id), status: 'processing' }, '接单成功');
  } catch (err) {
    console.error('接单错误:', err);
    return error(res, '接单失败', 500);
  }
};

// 完成订单
const completeOrder = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { completionImageUrls } = req.body;
    const repairmanId = req.user.userId;
    if (!completionImageUrls || !Array.isArray(completionImageUrls) || completionImageUrls.length === 0) {
      return error(res, '请上传完成凭证图片', 400);
    }
    const [orders] = await connection.execute(
      'SELECT orderId, status, repairmanId FROM repairOrders WHERE orderId = ?', [id]
    );
    if (orders.length === 0) return error(res, '订单不存在', 404);
    if (orders[0].status !== 'processing') return error(res, '只能完成进行中的订单', 400);
    if (orders[0].repairmanId !== repairmanId) return error(res, '只能完成自己接单的订单', 403);

    await connection.beginTransaction();
    await connection.execute(
      'UPDATE repairOrders SET status = ?, completedAt = NOW() WHERE orderId = ?',
      ['completed', id]
    );
    for (const imageUrl of completionImageUrls) {
      await connection.execute(
        'INSERT INTO completionImages (orderId, imageUrl, uploadedBy) VALUES (?, ?, ?)',
        [id, imageUrl, repairmanId]
      );
    }
    await connection.commit();
    return success(res, { orderId: parseInt(id), status: 'completed' }, '完成报修');
  } catch (err) {
    await connection.rollback();
    console.error('完成订单错误:', err);
    return error(res, '完成订单失败', 500);
  } finally {
    connection.release();
  }
};

// 维修工对用户进行反向评价
const evaluateUser = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, comment } = req.body;
    const repairmanId = req.user.userId;
    if (!rating || rating < 1 || rating > 5) return error(res, '评分必须在1-5之间', 400);

    // 检查订单归属维修工且已完成
    const [orders] = await pool.execute(
      'SELECT orderId, status, repairmanId FROM repairOrders WHERE orderId = ?', [orderId]
    );
    if (orders.length === 0) return error(res, '订单不存在', 404);
    if (orders[0].status !== 'completed') return error(res, '只能评价已完成的订单', 400);
    if (orders[0].repairmanId !== repairmanId) return error(res, '只能评价自己处理的订单', 403);

    // 检查用户已先评价
    const [evals] = await pool.execute(
      'SELECT evaluationId, repairmanEvaluatedAt FROM evaluations WHERE orderId = ?', [orderId]
    );
    if (evals.length === 0) return error(res, '用户尚未评价，暂不可进行反向评价', 400);
    if (evals[0].repairmanEvaluatedAt) return error(res, '已评价过', 400);

    await pool.execute(
      'UPDATE evaluations SET repairmanRating=?, repairmanComment=?, repairmanEvaluatedAt=NOW() WHERE orderId=?',
      [rating, comment || null, orderId]
    );
    return success(res, null, '评价成功');
  } catch (err) {
    console.error('反向评价错误:', err);
    return error(res, '评价失败', 500);
  }
};

module.exports = { getPendingOrders, getMyOrders, acceptOrder, completeOrder, evaluateUser };
```

**Step 2: Write the route**

```javascript
// server/routes/repairman.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getPendingOrders, getMyOrders, acceptOrder, completeOrder, evaluateUser } = require('../controllers/repairmanController');

router.use(authenticate);
router.use(authorize(['repairman']));

router.get('/orders/pending', getPendingOrders);
router.get('/orders/mine', getMyOrders);
router.put('/orders/:id/accept', acceptOrder);
router.put('/orders/:id/complete', completeOrder);
router.post('/evaluations/:orderId', evaluateUser);

module.exports = router;
```

**Step 3: Register in app.js**

```javascript
app.use('/api/repairman', require('./routes/repairman'));
```

**Step 4: Manual test**

Login as repairman, then:

```bash
# Get pending orders
curl -H "Authorization: Bearer <repairman_token>" http://localhost:3000/api/repairman/orders/pending

# Accept order #1
curl -X PUT -H "Authorization: Bearer <repairman_token>" http://localhost:3000/api/repairman/orders/1/accept
```

**Step 5: Commit**

```bash
git add server/controllers/repairmanController.js server/routes/repairman.js server/app.js
git commit -m "feat: add repairman work routes (accept/complete/evaluate)"
```

---

### Task 7: Order urge and withdraw endpoints

**Files:**
- Modify: `server/controllers/orderController.js`
- Modify: `server/routes/orders.js`

**Step 1: Read the existing orderController.js to understand the structure**

(Read `server/controllers/orderController.js` before editing)

**Step 2: Add urge function to orderController.js**

```javascript
// 催促订单（学生操作，订单超过6小时未接单）
const urgeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const [orders] = await pool.execute(
      'SELECT orderId, userId, status, createdAt, lastUrgedAt FROM repairOrders WHERE orderId = ?', [id]
    );
    if (orders.length === 0) return error(res, '订单不存在', 404);
    const order = orders[0];
    if (order.userId !== userId) return error(res, '无权操作此订单', 403);
    if (order.status !== 'pending') return error(res, '只能催促待接单的订单', 400);

    const now = new Date();
    const createdAt = new Date(order.createdAt);
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreation < 6) {
      const remainHours = (6 - hoursSinceCreation).toFixed(1);
      return error(res, `暂不可催促，请于 ${remainHours} 小时后再尝试`, 400);
    }

    await pool.execute(
      'UPDATE repairOrders SET lastUrgedAt = NOW(), urgeCount = urgeCount + 1 WHERE orderId = ?',
      [id]
    );
    return success(res, null, '催促成功，管理员将尽快处理');
  } catch (err) {
    console.error('催促订单错误:', err);
    return error(res, '催促失败', 500);
  }
};

// 撤回订单（只能撤回 pending 状态的自己的订单）
const withdrawOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const [orders] = await pool.execute(
      'SELECT orderId, userId, status FROM repairOrders WHERE orderId = ?', [id]
    );
    if (orders.length === 0) return error(res, '订单不存在', 404);
    if (orders[0].userId !== userId) return error(res, '无权操作此订单', 403);
    if (orders[0].status !== 'pending') return error(res, '只能撤回待接单的订单', 400);
    await pool.execute('UPDATE repairOrders SET status = ? WHERE orderId = ?', ['withdrawn', id]);
    return success(res, null, '订单已撤回');
  } catch (err) {
    console.error('撤回订单错误:', err);
    return error(res, '撤回失败', 500);
  }
};
```

Export these two functions alongside existing exports.

**Step 3: Add routes to orders.js**

In `server/routes/orders.js`, add (ensure `authenticate` middleware is applied):

```javascript
router.post('/:id/urge', authenticate, urgeOrder);
router.delete('/:id', authenticate, withdrawOrder);
```

Import `urgeOrder` and `withdrawOrder` from orderController.

**Step 4: Add urge notification to admin controller**

In `server/controllers/adminController.js`, update `getAllOrders` to include a count of urged orders, and add a new function for admin to see urged orders.

Add to adminController.js:

```javascript
// 获取被催促的订单（超管首页提示用）
const getUrgedOrders = async (req, res) => {
  try {
    const [orders] = await pool.execute(`
      SELECT o.orderId, o.repairType, o.building, o.roomNumber, o.createdAt,
             o.urgeCount, o.lastUrgedAt, u.realName as userRealName
      FROM repairOrders o
      LEFT JOIN users u ON o.userId = u.userId
      WHERE o.status = 'pending' AND o.urgeCount > 0
      ORDER BY o.lastUrgedAt DESC
    `);
    return success(res, orders, '获取催促订单成功');
  } catch (err) {
    console.error('获取催促订单错误:', err);
    return error(res, '获取催促订单失败', 500);
  }
};
```

Export it and add to admin route: `router.get('/orders/urged', getUrgedOrders);`

**Step 5: Manual test**

```bash
# Try urge on a new order (should fail - not 6 hours yet)
curl -X POST -H "Authorization: Bearer <student_token>" http://localhost:3000/api/orders/1/urge
# Expected: 400 暂不可催促，请于 X 小时后再尝试

# Withdraw a pending order
curl -X DELETE -H "Authorization: Bearer <student_token>" http://localhost:3000/api/orders/1
# Expected: 200 订单已撤回
```

**Step 6: Commit**

```bash
git add server/controllers/orderController.js server/controllers/adminController.js server/routes/orders.js server/routes/admin.js
git commit -m "feat: add order urge and withdraw endpoints, admin urged-orders view"
```

---

### Task 8: Update admin routes to read-only

**Files:**
- Modify: `server/routes/admin.js`

**Step 1: Remove accept/complete routes from admin**

The `acceptOrder` and `completeOrder` in `adminController.js` are now superseded by repairman routes. Remove these routes from `server/routes/admin.js`:

```javascript
// Remove these two lines:
// router.put('/orders/:id/accept', acceptOrder);
// router.put('/orders/:id/complete', completeOrder);

// Keep read-only routes:
router.get('/orders', getAllOrders);
router.get('/orders/pending', getPendingOrders);
router.get('/orders/urged', getUrgedOrders);
```

Also remove `acceptOrder` and `completeOrder` from the import in admin.js.

**Step 2: Commit**

```bash
git add server/routes/admin.js
git commit -m "feat: admin orders routes are now read-only, repairman handles accept/complete"
```

---

## Phase 3: Mini-Program

### Task 9: Update app.json with new pages

**Files:**
- Modify: `mini-program/app.json`

**Step 1: Add 5 new pages to the pages array**

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
    "pages/student-profile/student-profile",
    "pages/admin/admin",
    "pages/admin-pending/admin-pending",
    "pages/admin-completed/admin-completed",
    "pages/admin-announcements/admin-announcements",
    "pages/admin-evaluations/admin-evaluations",
    "pages/repairman/repairman",
    "pages/repairman-orders/repairman-orders",
    "pages/repairman-active/repairman-active",
    "pages/admin-residents/admin-residents",
    "pages/admin-repairmen/admin-repairmen"
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

**Step 2: Create placeholder files for each new page**

For each of the 5 new pages, create 4 empty files (.js, .wxml, .wxss, .json):
- `mini-program/pages/repairman/repairman.{js,wxml,wxss,json}`
- `mini-program/pages/repairman-orders/repairman-orders.{js,wxml,wxss,json}`
- `mini-program/pages/repairman-active/repairman-active.{js,wxml,wxss,json}`
- `mini-program/pages/admin-residents/admin-residents.{js,wxml,wxss,json}`
- `mini-program/pages/admin-repairmen/admin-repairmen.{js,wxml,wxss,json}`

Each `.json` can be `{}`. Each `.wxss` can be empty. Each `.wxml` can be `<view>loading...</view>`. Each `.js` can be `Page({ data: {} })`.

**Step 3: Update login redirect in index.js**

In `mini-program/pages/index/index.js`, the `redirectByRole` function already handles `repairman`. Verify it redirects to `/pages/repairman/repairman`. It currently does — no change needed.

**Step 4: Commit**

```bash
git add mini-program/app.json mini-program/pages/repairman/ mini-program/pages/repairman-orders/ mini-program/pages/repairman-active/ mini-program/pages/admin-residents/ mini-program/pages/admin-repairmen/
git commit -m "feat: add 5 new mini-program pages scaffolding"
```

---

### Task 10: Update register page

**Files:**
- Modify: `mini-program/pages/register/register.js`
- Modify: `mini-program/pages/register/register.wxml`

**Step 1: Update register.js**

Add `qqEmail` to data, add validateQQEmail(), include qqEmail in validateForm(), send qqEmail in handleRegister():

```javascript
// Add to data:
qqEmail: '',

// Add validate method:
validateQQEmail() {
  const { qqEmail } = this.data;
  if (!qqEmail) return 'QQ邮箱不能为空';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(qqEmail)) return '请输入正确的邮箱格式';
  return '';
},

// In validateForm(), add:
const qqEmailError = this.validateQQEmail();
if (qqEmailError) errors.qqEmail = qqEmailError;

// In handleRegister() data object, add:
qqEmail: qqEmail.trim(),

// In data destructuring at top of handleRegister(), add qqEmail
```

Remove `role` switching logic from register page — students only can self-register. Remove the switchRole method and role-related data/UI since only students register via this page.

**Step 2: Update register.wxml**

After the existing `building` input group, add a `qqEmail` input group:

```xml
<view class="input-group">
  <text class="input-label">QQ邮箱</text>
  <view class="input-wrapper {{errors.qqEmail ? 'error' : ''}}">
    <input
      class="input-field"
      placeholder="请输入QQ邮箱"
      value="{{qqEmail}}"
      bindinput="onInput"
      data-field="qqEmail"
    />
  </view>
  <text class="error-tip" wx:if="{{errors.qqEmail}}">{{errors.qqEmail}}</text>
</view>
```

Remove the role-tab switcher from the WXML since students can only register as student.

**Step 3: Verify in WeChat DevTools**

Open mini-program in WeChat Developer Tools. Navigate to register page. Verify:
- qqEmail field appears
- Empty submit shows validation errors for all fields
- Submit with test resident data succeeds

**Step 4: Commit**

```bash
git add mini-program/pages/register/
git commit -m "feat: register page validates against residents table, adds qqEmail field"
```

---

### Task 11: Update forgot-password page

**Files:**
- Modify: `mini-program/pages/forgot-password/forgot-password.js`
- Modify: `mini-program/pages/forgot-password/forgot-password.wxml`

**Step 1: Read existing forgot-password files before modifying**

**Step 2: Update forgot-password.js**

Current implementation likely only collects username + new password. Replace with a form collecting all 6 resident fields + new password + confirm password:

```javascript
Page({
  data: {
    username: '', realName: '', phone: '', building: '', roomNumber: '', qqEmail: '',
    newPassword: '', confirmPassword: '',
    isLoading: false,
    errors: {}
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value, [`errors.${field}`]: '' });
  },

  validateForm() {
    const errors = {};
    const { username, realName, phone, building, roomNumber, qqEmail, newPassword, confirmPassword } = this.data;
    if (!username.trim()) errors.username = '请输入学号';
    if (!realName.trim()) errors.realName = '请输入姓名';
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) errors.phone = '请输入正确的手机号';
    if (!building.trim()) errors.building = '请输入栋数';
    if (!roomNumber.trim()) errors.roomNumber = '请输入寝室号';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(qqEmail)) errors.qqEmail = '请输入正确的邮箱';
    if (!newPassword || newPassword.length < 6) errors.newPassword = '密码至少6位';
    if (newPassword !== confirmPassword) errors.confirmPassword = '两次密码不一致';
    this.setData({ errors });
    return Object.keys(errors).length === 0;
  },

  async handleReset() {
    if (!this.validateForm()) return;
    const { username, realName, phone, building, roomNumber, qqEmail, newPassword, confirmPassword } = this.data;
    this.setData({ isLoading: true });
    try {
      const { post } = require('../../utils/request.js');
      const res = await post('/auth/reset-password', {
        username: username.trim(), realName: realName.trim(), phone: phone.trim(),
        building: building.trim(), roomNumber: roomNumber.trim(), qqEmail: qqEmail.trim(),
        newPassword, confirmPassword
      });
      if (res.code === 200) {
        wx.showToast({ title: '密码重置成功', icon: 'success', duration: 1500 });
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        wx.showToast({ title: res.message || '重置失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: err.message || '网络错误', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  goBack() { wx.navigateBack(); }
});
```

**Step 3: Update forgot-password.wxml**

Build a form with input groups for: 学号, 姓名, 手机号, 栋数, 寝室号, QQ邮箱, 新密码, 确认密码, and a submit button. Follow the same styling pattern as register.wxml.

**Step 4: Commit**

```bash
git add mini-program/pages/forgot-password/
git commit -m "feat: forgot-password page now validates all 6 resident fields"
```

---

### Task 12: Repairman dashboard page

**Files:**
- Modify: `mini-program/pages/repairman/repairman.js`
- Modify: `mini-program/pages/repairman/repairman.wxml`
- Modify: `mini-program/pages/repairman/repairman.wxss`

**Step 1: Write repairman.js**

```javascript
const { get } = require('../../utils/request.js');

Page({
  data: {
    pendingCount: 0,
    myActiveOrders: [],
    myCompletedCount: 0,
    userInfo: {}
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({ userInfo });
  },

  onShow() {
    this.loadDashboard();
  },

  async loadDashboard() {
    try {
      const [pendingRes, myRes] = await Promise.all([
        get('/repairman/orders/pending'),
        get('/repairman/orders/mine')
      ]);
      const myOrders = myRes.code === 200 ? myRes.data : [];
      const activeOrders = myOrders.filter(o => o.status === 'processing');
      const completedCount = myOrders.filter(o => o.status === 'completed').length;
      this.setData({
        pendingCount: pendingRes.code === 200 ? pendingRes.data.length : 0,
        myActiveOrders: activeOrders,
        myCompletedCount: completedCount
      });
    } catch (err) {
      console.error('加载仪表盘失败', err);
    }
  },

  goToPending() { wx.navigateTo({ url: '/pages/repairman-orders/repairman-orders' }); },
  goToActive() { wx.navigateTo({ url: '/pages/repairman-active/repairman-active' }); },

  handleLogout() {
    wx.clearStorageSync();
    wx.redirectTo({ url: '/pages/index/index' });
  }
});
```

**Step 2: Write repairman.wxml**

```xml
<view class="container">
  <view class="header">
    <text class="title">维修工工作台</text>
    <text class="subtitle">{{userInfo.realName || userInfo.username}}</text>
  </view>

  <view class="stats-row">
    <view class="stat-card" bindtap="goToPending">
      <text class="stat-num">{{pendingCount}}</text>
      <text class="stat-label">待接单</text>
    </view>
    <view class="stat-card" bindtap="goToActive">
      <text class="stat-num">{{myActiveOrders.length}}</text>
      <text class="stat-label">进行中</text>
    </view>
    <view class="stat-card">
      <text class="stat-num">{{myCompletedCount}}</text>
      <text class="stat-label">已完成</text>
    </view>
  </view>

  <view class="section-title" wx:if="{{myActiveOrders.length > 0}}">我的进行中订单</view>
  <view class="order-list">
    <view class="order-item" wx:for="{{myActiveOrders}}" wx:key="orderId" bindtap="goToActive">
      <text class="order-type">{{item.repairType}}</text>
      <text class="order-room">{{item.building}} {{item.roomNumber}}</text>
      <text class="order-status processing">维修中</text>
    </view>
  </view>

  <button class="logout-btn" bindtap="handleLogout">退出登录</button>
</view>
```

**Step 3: Write basic repairman.wxss**

```css
.container { padding: 30rpx; background: #f5f5f5; min-height: 100vh; }
.header { text-align: center; padding: 40rpx 0; }
.title { font-size: 40rpx; font-weight: bold; display: block; }
.subtitle { font-size: 28rpx; color: #666; display: block; margin-top: 10rpx; }
.stats-row { display: flex; gap: 20rpx; margin: 30rpx 0; }
.stat-card { flex: 1; background: #fff; border-radius: 16rpx; padding: 30rpx; text-align: center; }
.stat-num { font-size: 56rpx; font-weight: bold; color: #1890ff; display: block; }
.stat-label { font-size: 24rpx; color: #999; display: block; margin-top: 8rpx; }
.section-title { font-size: 30rpx; font-weight: bold; margin: 20rpx 0 10rpx; }
.order-item { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; display: flex; justify-content: space-between; align-items: center; }
.order-type { font-size: 28rpx; font-weight: 500; }
.order-room { font-size: 24rpx; color: #666; }
.order-status.processing { color: #fa8c16; font-size: 24rpx; }
.logout-btn { margin-top: 60rpx; background: #ff4d4f; color: #fff; border: none; border-radius: 12rpx; }
```

**Step 4: Commit**

```bash
git add mini-program/pages/repairman/
git commit -m "feat: repairman dashboard page"
```

---

### Task 13: Repairman pending orders page (repairman-orders)

**Files:**
- Modify: `mini-program/pages/repairman-orders/repairman-orders.js`
- Modify: `mini-program/pages/repairman-orders/repairman-orders.wxml`
- Modify: `mini-program/pages/repairman-orders/repairman-orders.wxss`

**Step 1: Write repairman-orders.js**

```javascript
const { get, put } = require('../../utils/request.js');

Page({
  data: { orders: [], isLoading: false },

  onLoad() { this.loadOrders(); },
  onShow() { this.loadOrders(); },

  async loadOrders() {
    this.setData({ isLoading: true });
    try {
      const res = await get('/repairman/orders/pending');
      this.setData({ orders: res.code === 200 ? res.data : [] });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async handleAccept(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认接单',
      content: '确定接下这个报修单吗？',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        try {
          const res = await put(`/repairman/orders/${orderId}/accept`, {});
          if (res.code === 200) {
            wx.showToast({ title: '接单成功', icon: 'success' });
            this.loadOrders();
          } else {
            wx.showToast({ title: res.message || '接单失败', icon: 'none' });
          }
        } catch (err) {
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      }
    });
  }
});
```

**Step 2: Write repairman-orders.wxml**

```xml
<view class="container">
  <view class="page-title">待接单列表</view>
  <view wx:if="{{isLoading}}" class="loading">加载中...</view>
  <view wx:elif="{{orders.length === 0}}" class="empty">暂无待接单订单</view>
  <view wx:else>
    <view class="order-card" wx:for="{{orders}}" wx:key="orderId">
      <view class="order-header">
        <text class="repair-type">{{item.repairType}}</text>
        <text wx:if="{{item.urgeCount > 0}}" class="urged-badge">催促×{{item.urgeCount}}</text>
      </view>
      <text class="order-location">{{item.building}} {{item.roomNumber}}</text>
      <text class="order-desc">{{item.description}}</text>
      <text class="order-user">报修人: {{item.userRealName}}</text>
      <text class="order-contact">联系电话: {{item.contactPhone}}</text>
      <text class="order-time">提交时间: {{item.createdAt}}</text>
      <view class="image-list" wx:if="{{item.images.length > 0}}">
        <image wx:for="{{item.images}}" wx:for-item="img" wx:key="imageUrl" src="{{img.imageUrl}}" mode="aspectFill" class="order-img" />
      </view>
      <button class="accept-btn" bindtap="handleAccept" data-id="{{item.orderId}}">接单</button>
    </view>
  </view>
</view>
```

**Step 3: Write basic wxss** (follow same style pattern as repairman.wxss)

**Step 4: Commit**

```bash
git add mini-program/pages/repairman-orders/
git commit -m "feat: repairman pending orders page with accept functionality"
```

---

### Task 14: Repairman active orders page (repairman-active)

**Files:**
- Modify: `mini-program/pages/repairman-active/repairman-active.js`
- Modify: `mini-program/pages/repairman-active/repairman-active.wxml`
- Modify: `mini-program/pages/repairman-active/repairman-active.wxss`

**Step 1: Write repairman-active.js**

```javascript
const { get, put, post } = require('../../utils/request.js');

Page({
  data: {
    processingOrders: [],
    completedOrders: [],
    isLoading: false,
    showEvalModal: false,
    evalOrderId: null,
    evalRating: 5,
    evalComment: ''
  },

  onLoad() { this.loadOrders(); },
  onShow() { this.loadOrders(); },

  async loadOrders() {
    this.setData({ isLoading: true });
    try {
      const res = await get('/repairman/orders/mine');
      if (res.code === 200) {
        this.setData({
          processingOrders: res.data.filter(o => o.status === 'processing'),
          completedOrders: res.data.filter(o => o.status === 'completed')
        });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 上传完成凭证图片并完成订单
  async handleComplete(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.chooseImage({
      count: 5,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (imgRes) => {
        wx.showLoading({ title: '上传中...' });
        try {
          const token = wx.getStorageSync('token');
          const uploadPromises = imgRes.tempFilePaths.map(path => new Promise((resolve, reject) => {
            wx.uploadFile({
              url: 'http://localhost:3000/api/upload/completion',
              filePath: path,
              name: 'image',
              header: { Authorization: `Bearer ${token}` },
              success: (r) => {
                const data = JSON.parse(r.data);
                resolve(data.data.urls[0]);
              },
              fail: reject
            });
          }));
          const urls = await Promise.all(uploadPromises);
          wx.hideLoading();
          const res = await put(`/repairman/orders/${orderId}/complete`, { completionImageUrls: urls });
          if (res.code === 200) {
            wx.showToast({ title: '完成报修', icon: 'success' });
            this.loadOrders();
          } else {
            wx.showToast({ title: res.message || '操作失败', icon: 'none' });
          }
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      }
    });
  },

  openEvalModal(e) {
    const orderId = e.currentTarget.dataset.id;
    this.setData({ showEvalModal: true, evalOrderId: orderId, evalRating: 5, evalComment: '' });
  },

  closeEvalModal() { this.setData({ showEvalModal: false }); },

  onRatingChange(e) { this.setData({ evalRating: parseInt(e.detail.value) }); },
  onCommentInput(e) { this.setData({ evalComment: e.detail.value }); },

  async submitEval() {
    const { evalOrderId, evalRating, evalComment } = this.data;
    try {
      const res = await post(`/repairman/evaluations/${evalOrderId}`, { rating: evalRating, comment: evalComment });
      if (res.code === 200) {
        wx.showToast({ title: '评价成功', icon: 'success' });
        this.setData({ showEvalModal: false });
        this.loadOrders();
      } else {
        wx.showToast({ title: res.message || '评价失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  }
});
```

**Step 2: Write repairman-active.wxml**

Show two sections: "进行中" orders (with Complete button) and "已完成" orders (with "评价用户" button if user has evaluated but repairman hasn't).

```xml
<view class="container">
  <view class="section-title">进行中订单</view>
  <view wx:if="{{processingOrders.length === 0}}" class="empty">暂无进行中订单</view>
  <view class="order-card" wx:for="{{processingOrders}}" wx:key="orderId">
    <text class="repair-type">{{item.repairType}}</text>
    <text class="order-location">{{item.building}} {{item.roomNumber}}</text>
    <text class="order-desc">{{item.description}}</text>
    <button class="complete-btn" bindtap="handleComplete" data-id="{{item.orderId}}">上传凭证并完成</button>
  </view>

  <view class="section-title" style="margin-top:40rpx">已完成订单</view>
  <view wx:if="{{completedOrders.length === 0}}" class="empty">暂无已完成订单</view>
  <view class="order-card" wx:for="{{completedOrders}}" wx:key="orderId">
    <text class="repair-type">{{item.repairType}}</text>
    <text class="order-location">{{item.building}} {{item.roomNumber}}</text>
    <text class="order-status completed">已完成</text>
    <!-- 仅当用户已评价且维修工未评价时显示 -->
    <button wx:if="{{item.hasUserEval && !item.hasRepairmanEval}}" class="eval-btn" bindtap="openEvalModal" data-id="{{item.orderId}}">评价用户</button>
    <text wx:elif="{{item.hasRepairmanEval}}" class="eval-done">已评价</text>
    <text wx:else class="eval-wait">等待用户评价后可评价</text>
  </view>

  <!-- 评价弹窗 -->
  <view class="modal-overlay" wx:if="{{showEvalModal}}">
    <view class="modal">
      <text class="modal-title">评价用户</text>
      <text class="modal-label">评分 (1-5)</text>
      <slider min="1" max="5" value="{{evalRating}}" show-value bindchange="onRatingChange" />
      <textarea placeholder="评价内容（选填）" bindinput="onCommentInput" class="eval-textarea" />
      <view class="modal-btns">
        <button bindtap="closeEvalModal" class="cancel-btn">取消</button>
        <button bindtap="submitEval" class="submit-btn">提交</button>
      </view>
    </view>
  </view>
</view>
```

Note: `hasUserEval` and `hasRepairmanEval` need to be computed from the order data. Update the `loadOrders` function to fetch evaluation status for completed orders:

```javascript
// In loadOrders, after filtering completed orders:
const { get: getReq } = require('../../utils/request.js');
for (const order of completedOrders) {
  try {
    const evalRes = await getReq(`/evaluations/order/${order.orderId}`);
    if (evalRes.code === 200 && evalRes.data) {
      order.hasUserEval = !!evalRes.data.rating;
      order.hasRepairmanEval = !!evalRes.data.repairmanRating;
    }
  } catch {}
}
```

**Step 3: Add GET /evaluations/order/:orderId endpoint**

In `server/controllers/evaluationController.js`, add:

```javascript
const getOrderEvaluation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const [rows] = await pool.execute('SELECT * FROM evaluations WHERE orderId = ?', [orderId]);
    return success(res, rows.length > 0 ? rows[0] : null, '获取评价成功');
  } catch (err) {
    return error(res, '获取评价失败', 500);
  }
};
```

Add to `server/routes/evaluations.js`:
```javascript
router.get('/order/:orderId', authenticate, getOrderEvaluation);
```

**Step 4: Commit**

```bash
git add mini-program/pages/repairman-active/ server/controllers/evaluationController.js server/routes/evaluations.js
git commit -m "feat: repairman active orders page with complete and bidirectional eval"
```

---

### Task 15: Admin residents management page

**Files:**
- Modify: `mini-program/pages/admin-residents/admin-residents.js`
- Modify: `mini-program/pages/admin-residents/admin-residents.wxml`
- Modify: `mini-program/pages/admin-residents/admin-residents.wxss`

**Step 1: Write admin-residents.js**

```javascript
const { get, post, put, del } = require('../../utils/request.js');

Page({
  data: {
    residents: [],
    searchStudentId: '',
    isLoading: false,
    showModal: false,
    isEdit: false,
    editId: null,
    form: { studentId: '', name: '', phone: '', building: '', roomNumber: '', qqEmail: '' }
  },

  onLoad() { this.loadResidents(); },

  async loadResidents() {
    this.setData({ isLoading: true });
    const { searchStudentId } = this.data;
    try {
      const res = await get('/admin/residents' + (searchStudentId ? `?studentId=${searchStudentId}` : ''));
      this.setData({ residents: res.code === 200 ? res.data : [] });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  onSearchInput(e) { this.setData({ searchStudentId: e.detail.value }); },
  handleSearch() { this.loadResidents(); },

  openAddModal() {
    this.setData({
      showModal: true, isEdit: false, editId: null,
      form: { studentId: '', name: '', phone: '', building: '', roomNumber: '', qqEmail: '' }
    });
  },

  openEditModal(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showModal: true, isEdit: true, editId: item.residentId,
      form: { studentId: item.studentId, name: item.name, phone: item.phone, building: item.building, roomNumber: item.roomNumber, qqEmail: item.qqEmail }
    });
  },

  closeModal() { this.setData({ showModal: false }); },

  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  async handleSave() {
    const { form, isEdit, editId } = this.data;
    try {
      let res;
      if (isEdit) {
        res = await put(`/admin/residents/${editId}`, form);
      } else {
        res = await post('/admin/residents', form);
      }
      if (res.code === 200) {
        wx.showToast({ title: isEdit ? '更新成功' : '添加成功', icon: 'success' });
        this.setData({ showModal: false });
        this.loadResidents();
      } else {
        wx.showToast({ title: res.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  handleDelete(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认吗？',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        try {
          const res = await del(`/admin/residents/${id}`);
          if (res.code === 200) {
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadResidents();
          } else {
            wx.showToast({ title: res.message || '删除失败', icon: 'none' });
          }
        } catch {
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      }
    });
  },

  // Excel 导入：选择文件并上传
  async handleImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: (fileRes) => {
        const token = wx.getStorageSync('token');
        wx.showLoading({ title: '导入中...' });
        wx.uploadFile({
          url: 'http://localhost:3000/api/admin/residents/import',
          filePath: fileRes.tempFiles[0].path,
          name: 'file',
          header: { Authorization: `Bearer ${token}` },
          success: (r) => {
            wx.hideLoading();
            const data = JSON.parse(r.data);
            wx.showToast({ title: data.message || '导入完成', icon: 'none', duration: 3000 });
            this.loadResidents();
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '导入失败', icon: 'none' });
          }
        });
      }
    });
  }
});
```

**Step 2: Write admin-residents.wxml**

```xml
<view class="container">
  <view class="page-header">
    <text class="page-title">住户管理</text>
    <view class="header-btns">
      <button class="import-btn" bindtap="handleImport">Excel导入</button>
      <button class="add-btn" bindtap="openAddModal">+ 新增</button>
    </view>
  </view>

  <view class="search-bar">
    <input placeholder="按学号搜索" value="{{searchStudentId}}" bindinput="onSearchInput" class="search-input" />
    <button bindtap="handleSearch" class="search-btn">搜索</button>
  </view>

  <view wx:if="{{residents.length === 0}}" class="empty">暂无住户记录</view>
  <view class="resident-list">
    <view class="resident-item" wx:for="{{residents}}" wx:key="residentId">
      <view class="resident-info">
        <text class="student-id">学号: {{item.studentId}}</text>
        <text class="resident-name">{{item.name}}</text>
        <text class="resident-detail">{{item.building}} {{item.roomNumber}} | {{item.phone}}</text>
        <text class="resident-email">{{item.qqEmail}}</text>
        <text wx:if="{{item.isRegistered}}" class="registered-tag">已注册</text>
      </view>
      <view class="resident-actions">
        <button class="edit-btn" bindtap="openEditModal" data-item="{{item}}">编辑</button>
        <button class="delete-btn" bindtap="handleDelete" data-id="{{item.residentId}}">删除</button>
      </view>
    </view>
  </view>

  <!-- 新增/编辑弹窗 -->
  <view class="modal-overlay" wx:if="{{showModal}}">
    <view class="modal">
      <text class="modal-title">{{isEdit ? '编辑住户' : '新增住户'}}</text>
      <input placeholder="学号" value="{{form.studentId}}" bindinput="onFormInput" data-field="studentId" class="form-input" disabled="{{isEdit}}" />
      <input placeholder="姓名" value="{{form.name}}" bindinput="onFormInput" data-field="name" class="form-input" />
      <input placeholder="手机号" value="{{form.phone}}" bindinput="onFormInput" data-field="phone" class="form-input" />
      <input placeholder="栋数" value="{{form.building}}" bindinput="onFormInput" data-field="building" class="form-input" />
      <input placeholder="寝室号" value="{{form.roomNumber}}" bindinput="onFormInput" data-field="roomNumber" class="form-input" />
      <input placeholder="QQ邮箱" value="{{form.qqEmail}}" bindinput="onFormInput" data-field="qqEmail" class="form-input" />
      <view class="modal-btns">
        <button bindtap="closeModal" class="cancel-btn">取消</button>
        <button bindtap="handleSave" class="submit-btn">保存</button>
      </view>
    </view>
  </view>
</view>
```

**Step 3: Check request.js has `del` method**

Open `mini-program/utils/request.js`. If it doesn't have a `del` method, add:
```javascript
const del = (url, data = {}) => request(url, 'DELETE', data);
```
and export it.

**Step 4: Commit**

```bash
git add mini-program/pages/admin-residents/ mini-program/utils/request.js
git commit -m "feat: admin residents management page"
```

---

### Task 16: Admin repairmen management page

**Files:**
- Modify: `mini-program/pages/admin-repairmen/admin-repairmen.js`
- Modify: `mini-program/pages/admin-repairmen/admin-repairmen.wxml`

**Step 1: Write admin-repairmen.js**

```javascript
const { get, post, put, del } = require('../../utils/request.js');

Page({
  data: {
    repairmen: [],
    isLoading: false,
    showModal: false,
    isEdit: false,
    editId: null,
    form: { username: '', password: '', realName: '', phone: '' }
  },

  onLoad() { this.loadRepairmen(); },

  async loadRepairmen() {
    this.setData({ isLoading: true });
    try {
      const res = await get('/admin/repairmen');
      this.setData({ repairmen: res.code === 200 ? res.data : [] });
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  openAddModal() {
    this.setData({ showModal: true, isEdit: false, editId: null,
      form: { username: '', password: '', realName: '', phone: '' } });
  },

  openEditModal(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({ showModal: true, isEdit: true, editId: item.userId,
      form: { username: item.username, password: '', realName: item.realName, phone: item.phone } });
  },

  closeModal() { this.setData({ showModal: false }); },

  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  async handleSave() {
    const { form, isEdit, editId } = this.data;
    try {
      let res;
      if (isEdit) {
        const payload = { realName: form.realName, phone: form.phone };
        if (form.password) payload.password = form.password;
        res = await put(`/admin/repairmen/${editId}`, payload);
      } else {
        res = await post('/admin/repairmen', form);
      }
      if (res.code === 200) {
        wx.showToast({ title: isEdit ? '更新成功' : '添加成功', icon: 'success' });
        this.setData({ showModal: false });
        this.loadRepairmen();
      } else {
        wx.showToast({ title: res.message || '操作失败', icon: 'none' });
      }
    } catch {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  handleDelete(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '删除后维修工将无法登录，确认吗？',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        try {
          const res = await del(`/admin/repairmen/${id}`);
          if (res.code === 200) {
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadRepairmen();
          } else {
            wx.showToast({ title: res.message || '删除失败', icon: 'none' });
          }
        } catch {
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      }
    });
  }
});
```

**Step 2: Write admin-repairmen.wxml**

```xml
<view class="container">
  <view class="page-header">
    <text class="page-title">维修工管理</text>
    <button class="add-btn" bindtap="openAddModal">+ 新增维修工</button>
  </view>

  <view wx:if="{{repairmen.length === 0}}" class="empty">暂无维修工</view>
  <view class="repairman-list">
    <view class="repairman-item" wx:for="{{repairmen}}" wx:key="userId">
      <view class="repairman-info">
        <text class="repairman-name">{{item.realName}}</text>
        <text class="repairman-username">账号: {{item.username}}</text>
        <text class="repairman-phone">电话: {{item.phone}}</text>
      </view>
      <view class="repairman-actions">
        <button class="edit-btn" bindtap="openEditModal" data-item="{{item}}">编辑</button>
        <button class="delete-btn" bindtap="handleDelete" data-id="{{item.userId}}">删除</button>
      </view>
    </view>
  </view>

  <view class="modal-overlay" wx:if="{{showModal}}">
    <view class="modal">
      <text class="modal-title">{{isEdit ? '编辑维修工' : '新增维修工'}}</text>
      <input placeholder="用户名" value="{{form.username}}" bindinput="onFormInput" data-field="username" class="form-input" disabled="{{isEdit}}" />
      <input placeholder="{{isEdit ? '新密码（留空不修改）' : '密码'}}" value="{{form.password}}" bindinput="onFormInput" data-field="password" password class="form-input" />
      <input placeholder="姓名" value="{{form.realName}}" bindinput="onFormInput" data-field="realName" class="form-input" />
      <input placeholder="手机号" value="{{form.phone}}" bindinput="onFormInput" data-field="phone" class="form-input" />
      <view class="modal-btns">
        <button bindtap="closeModal" class="cancel-btn">取消</button>
        <button bindtap="handleSave" class="submit-btn">保存</button>
      </view>
    </view>
  </view>
</view>
```

**Step 3: Commit**

```bash
git add mini-program/pages/admin-repairmen/
git commit -m "feat: admin repairmen management page"
```

---

### Task 17: Update student-records page (urge + withdraw)

**Files:**
- Modify: `mini-program/pages/student-records/student-records.js`
- Modify: `mini-program/pages/student-records/student-records.wxml`

**Step 1: Read existing student-records.js**

**Step 2: Add urge and withdraw handlers**

Add to student-records.js:

```javascript
// 计算催促状态
computeUrgeStatus(order) {
  if (order.status !== 'pending') return null;
  const now = new Date();
  const createdAt = new Date(order.createdAt);
  const hours = (now - createdAt) / (1000 * 60 * 60);
  if (hours >= 6) return { canUrge: true, msg: '催促管理员' };
  const remain = (6 - hours).toFixed(1);
  return { canUrge: false, msg: `${remain}h后可催促` };
},

async handleUrge(e) {
  const orderId = e.currentTarget.dataset.id;
  try {
    const { post } = require('../../utils/request.js');
    const res = await post(`/orders/${orderId}/urge`, {});
    wx.showToast({ title: res.message || (res.code === 200 ? '催促成功' : '操作失败'), icon: res.code === 200 ? 'success' : 'none' });
    if (res.code === 200) this.loadOrders();
  } catch {
    wx.showToast({ title: '网络错误', icon: 'none' });
  }
},

async handleWithdraw(e) {
  const orderId = e.currentTarget.dataset.id;
  wx.showModal({
    title: '确认撤回',
    content: '撤回后报修单将关闭，确认吗？',
    success: async (modalRes) => {
      if (!modalRes.confirm) return;
      try {
        const { del } = require('../../utils/request.js');
        const res = await del(`/orders/${orderId}`);
        if (res.code === 200) {
          wx.showToast({ title: '已撤回', icon: 'success' });
          this.loadOrders();
        } else {
          wx.showToast({ title: res.message || '撤回失败', icon: 'none' });
        }
      } catch {
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    }
  });
},
```

In `loadOrders`, after fetching orders, compute `urgeStatus` for each pending order:
```javascript
orders.forEach(o => {
  if (o.status === 'pending') o.urgeStatus = this.computeUrgeStatus(o);
});
```

**Step 3: Update student-records.wxml**

Inside the order card, add (after the status badge, for pending orders):

```xml
<view wx:if="{{item.status === 'pending'}}" class="order-actions">
  <button
    class="urge-btn {{item.urgeStatus.canUrge ? 'urge-active' : 'urge-disabled'}}"
    bindtap="{{item.urgeStatus.canUrge ? 'handleUrge' : ''}}"
    data-id="{{item.orderId}}"
    disabled="{{!item.urgeStatus.canUrge}}"
  >{{item.urgeStatus.msg}}</button>
  <button class="withdraw-btn" bindtap="handleWithdraw" data-id="{{item.orderId}}">撤回</button>
</view>
```

**Step 4: Commit**

```bash
git add mini-program/pages/student-records/
git commit -m "feat: student-records page adds urge and withdraw functionality"
```

---

### Task 18: Update admin dashboard

**Files:**
- Modify: `mini-program/pages/admin/admin.js`
- Modify: `mini-program/pages/admin/admin.wxml`

**Step 1: Read existing admin.js**

**Step 2: Add urged orders count and new navigation entries**

In admin.js, add to `onShow`/`loadData`:

```javascript
// Load urged orders count
const urgedRes = await get('/admin/orders/urged');
this.setData({ urgedCount: urgedRes.code === 200 ? urgedRes.data.length : 0 });
```

Add navigation methods:
```javascript
goToResidents() { wx.navigateTo({ url: '/pages/admin-residents/admin-residents' }); },
goToRepairmen() { wx.navigateTo({ url: '/pages/admin-repairmen/admin-repairmen' }); },
goToUrged() { wx.navigateTo({ url: '/pages/admin-pending/admin-pending?filter=urged' }); },
```

**Step 3: Update admin.wxml**

Add new menu items in the dashboard grid:

```xml
<view class="menu-item" bindtap="goToResidents">
  <text class="menu-icon">🏠</text>
  <text class="menu-label">住户管理</text>
</view>
<view class="menu-item" bindtap="goToRepairmen">
  <text class="menu-icon">🔧</text>
  <text class="menu-label">维修工管理</text>
</view>
<view class="menu-item" bindtap="goToUrged">
  <text class="menu-icon">⚠️</text>
  <text class="menu-label">催促提醒</text>
  <text wx:if="{{urgedCount > 0}}" class="badge">{{urgedCount}}</text>
</view>
```

**Step 4: Commit**

```bash
git add mini-program/pages/admin/
git commit -m "feat: admin dashboard adds residents/repairmen management entries and urge notification badge"
```

---

### Task 19: Update admin-pending to read-only

**Files:**
- Modify: `mini-program/pages/admin-pending/admin-pending.js`
- Modify: `mini-program/pages/admin-pending/admin-pending.wxml`

**Step 1: Read existing admin-pending files**

**Step 2: Remove accept/complete action buttons from admin-pending.wxml**

Search for any "接单", "完成", "accept", "complete" button elements and remove them.

**Step 3: Remove handleAccept/handleComplete methods from admin-pending.js**

Delete those handler functions. The page becomes a read-only viewer.

**Step 4: Add support for `?filter=urged` query param**

In admin-pending.js `onLoad`:

```javascript
onLoad(options) {
  if (options.filter === 'urged') {
    this.setData({ filterUrged: true });
    this.loadUrgedOrders();
  } else {
    this.loadOrders();
  }
},

async loadUrgedOrders() {
  const res = await get('/admin/orders/urged');
  this.setData({ orders: res.code === 200 ? res.data : [] });
},
```

**Step 5: Commit**

```bash
git add mini-program/pages/admin-pending/
git commit -m "feat: admin-pending is now read-only, supports urged orders filter"
```

---

## Final: Verification Checklist

Before claiming completion, manually test these flows in WeChat DevTools and with the running server:

### Backend
- [ ] `POST /api/auth/register` with wrong resident info returns 400
- [ ] `POST /api/auth/register` with correct resident info returns 200
- [ ] Repairman login returns JWT with role=repairman
- [ ] `GET /api/repairman/orders/pending` works with repairman token
- [ ] `PUT /api/repairman/orders/:id/accept` changes status to processing
- [ ] `PUT /api/repairman/orders/:id/complete` changes status to completed
- [ ] `POST /api/orders/:id/urge` returns 400 if < 6 hours old
- [ ] `DELETE /api/orders/:id` (withdraw) works for pending orders
- [ ] `GET /api/admin/residents` returns resident list
- [ ] `POST /api/admin/residents/import` with xlsx file imports correctly
- [ ] `POST /api/repairman/evaluations/:orderId` fails if user hasn't rated yet
- [ ] `POST /api/repairman/evaluations/:orderId` succeeds after user rates

### Mini-Program
- [ ] Register page shows qqEmail field, blocks registration with wrong info
- [ ] Forgot-password requires all 6 resident fields
- [ ] Repairman login → redirects to repairman dashboard
- [ ] Repairman sees pending orders and can accept
- [ ] Repairman can complete order and upload photos
- [ ] Student-records shows withdraw button on pending orders
- [ ] Student-records shows urge button (or countdown) on pending orders
- [ ] Admin dashboard shows住户管理, 维修工管理, 催促提醒 entries
- [ ] Admin-residents page loads, search works, add/edit/delete works
- [ ] Admin-repairmen page loads, add/edit/delete works

---

## Dependency Reference

All new backend files created:
- `server/sql/migrate_v2.sql`
- `server/controllers/residentController.js`
- `server/controllers/adminRepairmanController.js`
- `server/controllers/repairmanController.js`
- `server/routes/residents.js`
- `server/routes/adminRepairmen.js`
- `server/routes/repairman.js`

All new mini-program pages:
- `mini-program/pages/repairman/` (4 files)
- `mini-program/pages/repairman-orders/` (4 files)
- `mini-program/pages/repairman-active/` (4 files)
- `mini-program/pages/admin-residents/` (4 files)
- `mini-program/pages/admin-repairmen/` (4 files)
