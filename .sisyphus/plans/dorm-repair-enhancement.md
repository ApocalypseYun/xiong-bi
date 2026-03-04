# 宿舍报修系统功能扩展

## TL;DR

> **Quick Summary**: 将现有双角色（student/admin）报修系统升级为三角色（student/repairman/super_admin）系统，新增住户验证、Excel导入、催单、撤单、双向评价功能。
> 
> **Deliverables**:
> - 数据库：4个表扩展/新增（users, residents, repairOrders, evaluations）
> - 后端API：15+ 新接口（认证、维修工管理、住户管理、订单增强、双向评价）
> - 前端页面：10+ 页面/组件（注册验证、维修工管理、住户管理、催单、撤单、评价）
> - 测试：Jest框架 + TDD测试用例
> - 文档：API文档更新、数据库迁移SQL
>
> **Estimated Effort**: XL (大型重构 + 新功能)
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: 数据库迁移 → 认证系统 → 维修工/住户管理 → 订单增强 → 双向评价

---

## Context

### Original Request
扩展宿舍报修系统：
1. 三角色登录（住户、维修工、超级管理员）
2. 住户注册需验证（学号+姓名+电话+栋数+寝室号）
3. 维修工由超管添加管理
4. 超管可Excel导入住户、查看所有订单、管理维修工
5. 催单功能（6小时限制）
6. 撤单功能（仅pending）
7. 双向评价（先住户后维修工，7天窗口）

### Interview Summary

**技术决策**:
- 数据来源: Excel导入为主（超管批量导入）
- 角色过渡: admin → super_admin（现有admin全部升级）
- 邮箱验证: 简化版（匹配注册信息+邮箱）
- 接单模式: 维修工自由接单
- 催单规则: 6小时后可催1次
- 撤单约束: 仅pending可撤
- 评价窗口: 7天必须评价

**范围边界**:
- IN: 三角色系统、residents验证表、Excel导入、催单、撤单、双向评价、TDD测试
- OUT: 真实SMTP邮件、短信验证、管理员修改订单

**技术栈**:
- 前端: 微信小程序
- 后端: Node.js + Express
- 数据库: MySQL
- 认证: JWT
- 测试: Jest (新增)

### Metis Review

**识别的差距** (已解决):
- residents与users关系: 独立验证表
- 催单业务规则: 6小时后可催1次
- 撤单约束: 仅pending可撤
- 评价时间窗口: 7天

**设置的边界**:
- Excel文件: ≤5000行，≤5MB
- 催单频率: 每订单最多1次
- 评价窗口: 7天过期
- 撤单: 仅pending状态

---

## Work Objectives

### Core Objective
将现有双角色报修系统升级为企业级三角色管理系统，支持住户验证、批量导入、订单催促、撤回和双向评价，提升系统可维护性和用户体验。

### Concrete Deliverables

**数据库层**:
- `server/sql/migrations/001_multi_role_system.sql` - 数据库迁移脚本
- `server/sql/migrations/002_residents_table.sql` - 住户验证表
- `server/sql/migrations/003_order_enhancements.sql` - 订单增强字段
- `server/sql/migrations/004_dual_evaluation.sql` - 双向评价扩展

**后端API**:
- `server/routes/auth.js` (扩展) - 注册验证、邮箱密码重置
- `server/routes/repairman.js` (新增) - 维修工CRUD
- `server/routes/resident.js` (新增) - 住户CRUD + Excel导入
- `server/routes/order.js` (扩展) - 催单、撤单接口
- `server/routes/evaluation.js` (扩展) - 双向评价接口

**前端页面**:
- `mini-program/pages/auth/register` (扩展) - 注册验证UI
- `mini-program/pages/admin/repairman` (新增) - 维修工管理页
- `mini-program/pages/admin/resident` (新增) - 住户管理页
- `mini-program/pages/order/detail` (扩展) - 催单、撤单、评价UI
- `mini-program/pages/repairman/` (新增) - 维修工专用页面

**测试**:
- `server/__tests__/` - Jest测试框架 + TDD用例
- 测试覆盖率 ≥ 80%

### Definition of Done
- [ ] 所有数据库迁移SQL执行成功
- [ ] 现有admin全部升级为super_admin
- [ ] 15+ API接口功能完整 + TDD测试通过
- [ ] 10+ 小程序页面UI完成 + 交互正常
- [ ] Excel导入功能正常（≤5000行）
- [ ] 催单功能：6小时限制 + 列表标记
- [ ] 撤单功能：仅pending可撤
- [ ] 双向评价：7天窗口 + 顺序控制
- [ ] `npm test` 全部通过
- [ ] Git提交：atomic commits with clear messages

### Must Have
1. 三角色系统完整运行（student/repairman/super_admin）
2. residents验证表 + Excel批量导入
3. 注册时验证住户信息（5字段全部匹配）
4. 密码重置功能（简化版邮箱验证）
5. 催单功能（6小时限制 + 列表标记）
6. 撤单功能（仅pending状态）
7. 双向评价（先住户后维修工）
8. 维修工管理（超管CRUD）
9. 住户管理（超管CRUD + 搜索）
10. TDD测试框架 + ≥80%覆盖率

### Must NOT Have (Guardrails)
1. ❌ 不实现真实SMTP邮件发送
2. ❌ 不实现短信验证码
3. ❌ 不允许管理员修改/删除订单（只读）
4. ❌ 不允许多次催单（每订单最多1次）
5. ❌ 不允许processing状态撤单
6. ❌ 不允许7天后继续评价
7. ❌ 不允许维修工先于住户评价
8. ❌ 不添加通知系统（微信模板消息）
9. ❌ 不添加即时通讯功能
10. ❌ 不添加统计报表功能

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (需新建)
- **Automated tests**: TDD (测试驱动开发)
- **Framework**: Jest (Node.js测试框架)
- **TDD Workflow**: 每个功能开发前先写失败测试，再写实现使测试通过

### QA Policy
Every task MUST include agent-executed QA scenarios (see TODO template below).
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **后端API**: Use Bash (curl) — 发送HTTP请求，验证status code + response fields
- **数据库**: Use Bash (mysql CLI) — 查询验证数据变更
- **前端UI**: Use 手动验证（小程序限制）— 录屏 + 截图保存
- **集成流程**: Use Bash (完整API调用链) — 从注册到评价的完整流程

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (基础设施 — 可立即开始):
├── Task 1: Jest测试框架搭建 [quick]
├── Task 2: 数据库迁移 - users表扩展 [quick]
├── Task 3: 数据库迁移 - residents表创建 [quick]
├── Task 4: 数据库迁移 - repairOrders+evaluations扩展 [quick]
└── Task 5: 中间件权限扩展 (authenticate/authorize) [quick]

Wave 2 (认证与用户管理 — 依赖Wave 1):
├── Task 6: 注册验证API (匹配residents表) [deep]
├── Task 7: 密码重置API (简化版邮箱验证) [quick]
├── Task 8: 维修工管理API (CRUD) [deep]
├── Task 9: 住户管理API (CRUD) [deep]
└── Task 10: Excel导入API (批量住户导入) [deep]

Wave 3 (订单增强 — 依赖Wave 2):
├── Task 11: 催单功能API (6小时限制) [deep]
├── Task 12: 撤单功能API (仅pending) [quick]
├── Task 13: 订单列表增强 (催促标记筛选) [quick]
└── Task 14: 双向评价API (先住户后维修工) [deep]

Wave 4 (前端UI — 依赖Wave 3):
├── Task 15: 注册页面改造 (验证UI) [visual-engineering]
├── Task 16: 超管-维修工管理页 [visual-engineering]
├── Task 17: 超管-住户管理页 (Excel导入) [visual-engineering]
├── Task 18: 订单详情页增强 (催单+撤单+评价) [visual-engineering]
└── Task 19: 维修工专用页面 (接单+完成+评价) [visual-engineering]

Wave 5 (最终验证 — 依赖所有):
├── Task F1: 计划合规审计 (oracle)
├── Task F2: 代码质量检查 (unspecified-high)
├── Task F3: 集成测试 (unspecified-high)
└── Task F4: 范围保真检查 (deep)

Critical Path: Task 1 → Task 2-5 → Task 6-10 → Task 11-14 → Task 15-19 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Wave 1)
```

### Dependency Matrix (abbreviated — show ALL tasks in your generated plan)

- **1-5**: — — 6-10
- **6-10**: 2-5 — 11-14, 15-19
- **11-14**: 6-10 — 15-19, F1-F4
- **15-19**: 11-14 — F1-F4
- **F1-F4**: 15-19 — —

> This is abbreviated for reference. YOUR generated plan must include the FULL matrix for ALL tasks.

### Agent Dispatch Summary

- **Wave 1**: **5** — T1-T4 → `quick`, T5 → `quick`
- **Wave 2**: **5** — T6 → `deep`, T7 → `quick`, T8-T10 → `deep`
- **Wave 3**: **4** — T11 → `deep`, T12-T13 → `quick`, T14 → `deep`
- **Wave 4**: **5** — T15-T19 → `visual-engineering`
- **Wave 5**: **4** — F1 → `oracle`, F2-F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

- [ ] 1. Jest测试框架搭建

  **What to do**:
  - 初始化Jest测试框架: `npm install --save-dev jest supertest`
  - 创建`server/jest.config.js`配置文件
  - 创建`server/__tests__/setup.js`测试环境初始化（数据库连接、清理）
  - 在`package.json`添加测试脚本: `"test": "jest --coverage"`
  - 编写示例测试验证框架可用
  - **TDD**: 先写测试配置，确保`npm test`可运行

  **Must NOT do**:
  - 不要使用Mocha/Chai（统一用Jest）
  - 不要跳过coverage配置
  - 不要连接生产数据库测试

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 标准npm包安装+配置，无复杂逻辑
  - **Skills**: [`coding-standards`]
    - `coding-standards`: 确保测试代码风格一致

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-5)
  - **Blocks**: Tasks 6-19 (所有需要测试的功能)
  - **Blocked By**: None (可立即开始)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References**:
  - `server/package.json` - 当前项目依赖和脚本配置
  - `server/app.js` - Express应用入口，用于测试时启动服务器

  **External References**:
  - Jest docs: `https://jestjs.io/docs/getting-started` - Jest基础配置
  - Supertest docs: `https://github.com/visionmedia/supertest` - HTTP断言库

  **WHY Each Reference Matters**:
  - `server/package.json`: 需要添加jest依赖和test脚本
  - `server/app.js`: 测试需要import app实例来发送HTTP请求
  - Jest docs: 了解配置选项和最佳实践
  - Supertest docs: API测试的标准库

  **Acceptance Criteria**:
  - [ ] Jest和supertest已安装并在package.json中
  - [ ] jest.config.js配置完成（coverage, testMatch, setupFiles）
  - [ ] `server/__tests__/setup.js`存在且包含数据库连接/清理逻辑
  - [ ] `npm test`可执行并输出coverage报告
  - [ ] 至少1个示例测试文件存在且通过

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Jest框架正常运行
    Tool: Bash (npm test)
    Preconditions: Jest已安装，jest.config.js已配置
    Steps:
      1. 执行 `cd server && npm test`
      2. 验证输出包含 "Test Suites: 1 passed"
      3. 验证输出包含 "Coverage" 报告
    Expected Result: npm test成功执行，显示测试通过和覆盖率报告
    Failure Indicators: 
      - 命令执行失败（非零退出码）
      - 未显示coverage报告
      - 测试套件数量为0
    Evidence: .sisyphus/evidence/task-01-jest-running.log

  Scenario: 测试数据库连接成功
    Tool: Bash (npm test)
    Preconditions: setup.js已创建，包含数据库连接逻辑
    Steps:
      1. 在setup.js中添加简单的数据库ping测试
      2. 执行 `npm test`
      3. 验证测试前数据库连接成功，测试后连接关闭
    Expected Result: 测试前后数据库连接正常，无连接泄漏
    Failure Indicators:
      - "ECONNREFUSED" 错误
      - "Too many connections" 错误
    Evidence: .sisyphus/evidence/task-01-db-connection.log
  ```

  **Evidence to Capture**:
  - [ ] Jest安装成功的package.json截图
  - [ ] npm test执行日志
  - [ ] coverage报告截图

  **Commit**: NO (与Task 2-5一起提交)
  - Message: `feat(test): setup Jest testing framework with coverage`
  - Files: `server/package.json`, `server/jest.config.js`, `server/__tests__/setup.js`
  - Pre-commit: `npm test`

---

- [ ] 2. 数据库迁移 - users表扩展

  **What to do**:
  - 创建迁移文件: `server/sql/migrations/001_multi_role_system.sql`
  - 扩展users表role字段为ENUM('student', 'repairman', 'super_admin')
  - 添加email字段: `ALTER TABLE users ADD COLUMN email VARCHAR(100) AFTER phone`
  - 升级现有admin为super_admin: `UPDATE users SET role = 'super_admin' WHERE role = 'admin'`
  - **TDD**: 先写测试验证迁移后数据结构正确

  **Must NOT do**:
  - 不要直接修改init.sql（使用迁移文件）
  - 不要删除现有数据
  - 不要忘记WHERE子句（防止全表更新错误）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 标准SQL迁移，2-3条语句
  - **Skills**: [`postgres-patterns`]
    - `postgres-patterns`: 虽然用的是MySQL，但迁移模式通用

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-5)
  - **Blocks**: Tasks 6-19 (所有需要新角色/邮箱的功能)
  - **Blocked By**: Task 1 (需要Jest测试迁移)

  **References**:

  **Pattern References**:
  - `server/sql/init.sql:23-38` - 当前users表定义，扩展时需保持兼容
  - `server/middleware/auth.js:45` - authorize中间件，需支持新角色

  **External References**:
  - MySQL ALTER TABLE: `https://dev.mysql.com/doc/refman/8.0/en/alter-table.html`

  **WHY Each Reference Matters**:
  - `server/sql/init.sql`: 了解当前表结构，确保迁移不破坏现有字段
  - `server/middleware/auth.js`: 角色变更会影响权限检查逻辑
  - MySQL ALTER TABLE: 正确的SQL语法

  **Acceptance Criteria**:
  - [ ] 迁移文件001_multi_role_system.sql已创建
  - [ ] users表role字段已扩展为3种角色
  - [ ] users表email字段已添加
  - [ ] 现有admin用户已全部升级为super_admin
  - [ ] 迁移后数据完整性测试通过（无数据丢失）

  **QA Scenarios**:

  ```
  Scenario: 角色扩展成功
    Tool: Bash (mysql CLI)
    Preconditions: 迁移SQL已执行
    Steps:
      1. 执行 `mysql -u root -p xiong_bi -e "SHOW COLUMNS FROM users WHERE Field='role'"`
      2. 验证Type包含 'student', 'repairman', 'super_admin'
    Expected Result: role字段ENUM包含3种角色
    Failure Indicators:
      - ENUM仍只有2种角色
      - 字段不存在
    Evidence: .sisyphus/evidence/task-02-role-enum.txt

  Scenario: 现有admin成功升级
    Tool: Bash (mysql CLI)
    Preconditions: 迁移SQL已执行
    Steps:
      1. 执行 `mysql -u root -p xiong_bi -e "SELECT userId, username, role FROM users WHERE role='super_admin'"`
      2. 验证原有admin用户role已变为super_admin
      3. 验证无role='admin'的用户
    Expected Result: 所有admin升级为super_admin，无遗留admin
    Failure Indicators:
      - 仍有role='admin'的记录
      - super_admin数量与原admin数量不符
    Evidence: .sisyphus/evidence/task-02-admin-upgrade.txt

  Scenario: email字段添加成功
    Tool: Bash (mysql CLI)
    Preconditions: 迁移SQL已执行
    Steps:
      1. 执行 `mysql -u root -p xiong_bi -e "SHOW COLUMNS FROM users WHERE Field='email'"`
      2. 验证Type为varchar(100)，允许NULL
    Expected Result: email字段存在且类型正确
    Failure Indicators:
      - 字段不存在
      - 类型不匹配
    Evidence: .sisyphus/evidence/task-02-email-field.txt
  ```

  **Evidence to Capture**:
  - [ ] 迁移SQL执行日志
  - [ ] 表结构变更前后对比截图
  - [ ] admin升级结果查询日志

  **Commit**: NO (与Task 1, 3-5一起提交)
  - Message: `feat(db): extend users table with multi-role system and email`
  - Files: `server/sql/migrations/001_multi_role_system.sql`, `server/__tests__/migrations/001.test.js`
  - Pre-commit: `npm test`

---

- [ ] 3. 数据库迁移 - residents表创建

  **What to do**:
  - 创建迁移文件: `server/sql/migrations/002_residents_table.sql`
  - 创建residents表（住户验证表）:
    - resident_id (PRIMARY KEY AUTO_INCREMENT)
    - student_id VARCHAR(50) UNIQUE NOT NULL (学号)
    - name VARCHAR(50) NOT NULL
    - phone VARCHAR(20) NOT NULL
    - building VARCHAR(50) NOT NULL (栋数)
    - room_number VARCHAR(50) NOT NULL (寝室号)
    - created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  - 添加索引: idx_student (student_id), idx_room (building, room_number)
  - **TDD**: 先写测试验证表结构和约束正确

  **Must NOT do**:
  - 不要添加外键关联users表（residents独立验证表）
  - 不要允许student_id重复
  - 不要添加过多字段（仅验证所需5字段）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 标准CREATE TABLE语句
  - **Skills**: [`postgres-patterns`]
    - `postgres-patterns`: 表设计模式通用

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-5)
  - **Blocks**: Task 6 (注册验证), Task 10 (Excel导入)
  - **Blocked By**: Task 1 (需要Jest测试迁移)

  **References**:

  **Pattern References**:
  - `server/sql/init.sql` - 现有表结构风格参考
  - Draft文档: residents表设计 - 完整字段定义

  **External References**:
  - MySQL CREATE TABLE: `https://dev.mysql.com/doc/refman/8.0/en/create-table.html`

  **WHY Each Reference Matters**:
  - `server/sql/init.sql`: 保持命名风格一致（snake_case）
  - Draft文档: 包含最终确认的字段定义
  - MySQL CREATE TABLE: 正确语法和约束

  **Acceptance Criteria**:
  - [ ] 迁移文件002_residents_table.sql已创建
  - [ ] residents表已创建且包含6个核心字段
  - [ ] student_id字段UNIQUE约束生效
  - [ ] 两个索引已创建（idx_student, idx_room）
  - [ ] 表结构测试通过

  **QA Scenarios**:

  ```
  Scenario: residents表创建成功
    Tool: Bash (mysql CLI)
    Preconditions: 迁移SQL已执行
    Steps:
      1. 执行 `mysql -u root -p xiong_bi -e "DESCRIBE residents"`
      2. 验证6个字段全部存在：resident_id, student_id, name, phone, building, room_number, created_at
      3. 验证字段类型正确（VARCHAR长度、NOT NULL约束）
    Expected Result: 表结构完全符合设计
    Failure Indicators:
      - 字段缺失
      - 类型不匹配
      - 约束缺失
    Evidence: .sisyphus/evidence/task-03-residents-table.txt

  Scenario: student_id唯一约束生效
    Tool: Bash (mysql CLI)
    Preconditions: 迁移SQL已执行
    Steps:
      1. 插入测试数据: `INSERT INTO residents (student_id, name, phone, building, room_number) VALUES ('2023001', '张三', '13800138000', '1栋', '101')`
      2. 尝试插入重复student_id: `INSERT INTO residents (...) VALUES ('2023001', '李四', ...)`
      3. 验证第二次插入失败（Duplicate entry错误）
    Expected Result: 唯一约束阻止重复学号
    Failure Indicators:
      - 重复插入成功
      - 无错误提示
    Evidence: .sisyphus/evidence/task-03-unique-constraint.txt

  Scenario: 索引创建成功
    Tool: Bash (mysql CLI)
    Preconditions: 迁移SQL已执行
    Steps:
      1. 执行 `mysql -u root -p xiong_bi -e "SHOW INDEX FROM residents"`
      2. 验证idx_student和idx_room索引存在
    Expected Result: 两个索引已创建
    Failure Indicators:
      - 索引缺失
    Evidence: .sisyphus/evidence/task-03-indexes.txt
  ```

  **Evidence to Capture**:
  - [ ] 表结构DESCRIBE输出
  - [ ] 唯一约束测试结果
  - [ ] 索引列表

  **Commit**: NO (与Task 1-2, 4-5一起提交)
  - Message: `feat(db): create residents table for registration verification`
  - Files: `server/sql/migrations/002_residents_table.sql`, `server/__tests__/migrations/002.test.js`
  - Pre-commit: `npm test`


---

- [ ] 4. 数据库迁移 - repairOrders和evaluations表扩展

  **What to do**:
  - 创建迁移文件: `server/sql/migrations/003_order_enhancements.sql`
  - repairOrders表扩展:
    - 添加 `is_urge BOOLEAN DEFAULT FALSE COMMENT '是否已催促'`
    - 添加 `urge_time DATETIME COMMENT '催促时间'`
    - 修改status为ENUM('pending', 'processing', 'completed', 'withdrawn')
    - 添加索引: `idx_urge (is_urge, urge_time)`
  - evaluations表扩展:
    - 添加 `repairman_rating TINYINT COMMENT '维修工评分 1-5'`
    - 添加 `repairman_comment TEXT COMMENT '维修工评价'`
    - 添加 `repairman_evaluated_at DATETIME COMMENT '维修工评价时间'`
  - **TDD**: 先写测试验证迁移后功能正确

  **Must NOT do**:
  - 不要删除现有字段
  - 不要破坏现有评价数据

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 标准ALTER TABLE语句
  - **Skills**: [`postgres-patterns`]
    - `postgres-patterns`: 迁移模式通用

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5)
  - **Blocks**: Tasks 11-14 (催单、撤单、评价功能)
  - **Blocked By**: Task 1 (需要Jest测试迁移)

  **References**:
  - `server/sql/init.sql:repairOrders定义` - 当前表结构
  - `server/sql/init.sql:evaluations定义` - 当前评价表

  **Acceptance Criteria**:
  - [ ] 迁移文件已创建
  - [ ] repairOrders表新增is_urge, urge_time字段
  - [ ] status ENUM包含withdrawn
  - [ ] evaluations表新增3个维修工评价字段
  - [ ] 索引创建成功

  **QA Scenarios**:
  ```
  Scenario: 订单催促字段添加成功
    Tool: Bash (mysql CLI)
    Steps:
      1. SHOW COLUMNS FROM repairOrders WHERE Field='is_urge'
      2. 验证Type为tinyint(1), Default为0
    Expected Result: 字段存在且默认值正确
    Evidence: .sisyphus/evidence/task-04-urge-field.txt

  Scenario: 撤单状态扩展成功
    Tool: Bash (mysql CLI)
    Steps:
      1. SHOW COLUMNS FROM repairOrders WHERE Field='status'
      2. 验证Type包含'withdrawn'
    Expected Result: status ENUM包含4种状态
    Evidence: .sisyphus/evidence/task-04-status-enum.txt
  ```

  **Commit**: NO (Wave 1统一提交)
  - Files: `server/sql/migrations/003_order_enhancements.sql`

---

- [ ] 5. 中间件权限扩展

  **What to do**:
  - 扩展`server/middleware/auth.js`的authorize函数
  - 支持3种新角色: student, repairman, super_admin
  - 保持向后兼容（现有API不中断）
  - **TDD**: 先写测试验证权限检查正确

  **Must NOT do**:
  - 不要破坏现有权限逻辑
  - 不要硬编码角色列表（使用配置）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单的枚举扩展
  - **Skills**: [`coding-standards`]
    - `coding-standards`: 代码风格一致性

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4)
  - **Blocks**: Tasks 6-19 (所有需要权限检查的功能)
  - **Blocked By**: Task 1 (需要Jest测试)

  **References**:
  - `server/middleware/auth.js:45` - authorize函数实现
  - Draft文档: 角色权限矩阵 - 完整权限定义

  **Acceptance Criteria**:
  - [ ] authorize函数支持3种角色
  - [ ] 现有API权限检查仍然正常
  - [ ] 测试覆盖所有角色组合

  **QA Scenarios**:
  ```
  Scenario: 三角色权限检查正确
    Tool: Bash (curl)
    Steps:
      1. 创建3种角色测试账号
      2. 分别访问student/repairman/super_admin专属API
      3. 验证权限拒绝/允许正确
    Expected Result: 各角色只能访问自己权限内的API
    Evidence: .sisyphus/evidence/task-05-auth-middleware.log
  ```

  **Commit**: YES
  - Message: `feat(auth): extend middleware to support three roles`
  - Files: `server/middleware/auth.js`, `server/__tests__/middleware/auth.test.js`
  - Pre-commit: `npm test`


---

## Wave 2: 认证与用户管理（依赖Wave 1完成）

---

- [ ] 6. 注册验证API（匹配residents表）

  **What to do**:
  - 扩展`server/controllers/authController.js`的register函数
  - 注册时验证：username(学号), realName, phone, building, roomNumber必须全部匹配residents表
  - 验证通过后创建user记录，role='student'
  - 返回详细错误信息（哪些字段不匹配）
  - **TDD**: 先写测试覆盖验证成功/失败场景

  **Must NOT do**:
  - 不要允许任意注册（必须匹配residents表）
  - 不要泄露residents表的完整信息（仅返回匹配结果）
  - 不要创建重复账号（学号已注册检查）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 涉及多表查询+业务逻辑验证
  - **Skills**: [`backend-patterns`]
    - `backend-patterns`: API设计和数据验证模式

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7-10)
  - **Blocks**: Task 15 (注册页面UI)
  - **Blocked By**: Tasks 2-3 (users+residents表), Task 5 (中间件)

  **References**:
  - `server/controllers/authController.js:10-30` - 当前register实现
  - `server/sql/init.sql:residents表` - 验证字段定义
  - Draft文档: "注册时验证住户信息（学号+姓名+电话+栋数+寝室号）"

  **Acceptance Criteria**:
  - [ ] POST /api/auth/register验证5字段匹配
  - [ ] 匹配失败返回具体错误（哪些字段不匹配）
  - [ ] 学号已注册返回409 Conflict
  - [ ] 测试覆盖：验证成功、验证失败、重复注册

  **QA Scenarios**:
  ```
  Scenario: 注册验证成功
    Tool: Bash (curl)
    Preconditions: residents表有测试数据（学号2023001）
    Steps:
      1. curl -X POST /api/auth/register -d '{"username":"2023001","realName":"张三","phone":"13800138000","building":"1栋","roomNumber":"101","password":"Pass123"}'
      2. 验证返回201 Created + token
      3. 验证users表新增student记录
    Expected Result: 注册成功，可登录
    Evidence: .sisyphus/evidence/task-06-register-success.log

  Scenario: 注册验证失败（字段不匹配）
    Tool: Bash (curl)
    Steps:
      1. 提交错误phone号码
      2. 验证返回400 + {"error":"住户信息验证失败","mismatchedFields":["phone"]}
    Expected Result: 返回具体不匹配字段
    Evidence: .sisyphus/evidence/task-06-register-fail.log
  ```

  **Commit**: YES
  - Message: `feat(auth): add resident verification for registration`
  - Files: `server/controllers/authController.js`, `server/__tests__/auth/register.test.js`

---

- [ ] 7. 密码重置API（简化版邮箱验证）

  **What to do**:
  - 扩展`server/controllers/authController.js`
  - 新增 POST /api/auth/reset-password接口
  - 验证：username + email + realName + phone全部匹配
  - 匹配成功后允许重置密码
  - **TDD**: 先写测试覆盖验证+重置流程

  **Must NOT do**:
  - 不要发送真实邮件（简化版）
  - 不要允许仅凭username重置（必须多字段验证）
  - 不要重置不存在的账号

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单的验证+更新逻辑
  - **Skills**: [`backend-patterns`]
    - `backend-patterns`: 安全验证模式

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8-10)
  - **Blocks**: Task 15 (注册页面密码重置UI)
  - **Blocked By**: Task 2 (users表email字段)

  **References**:
  - `server/controllers/authController.js:50-60` - 当前resetPassword实现
  - Draft文档: "密码重置：验证邮箱+注册信息"

  **Acceptance Criteria**:
  - [ ] POST /api/auth/reset-password验证4字段
  - [ ] 验证失败返回401 Unauthorized
  - [ ] 验证成功返回200 + 密码重置成功
  - [ ] 测试覆盖：成功、失败、不存在的用户

  **QA Scenarios**:
  ```
  Scenario: 密码重置成功
    Tool: Bash (curl)
    Steps:
      1. curl -X POST /api/auth/reset-password -d '{"username":"2023001","email":"test@qq.com","realName":"张三","phone":"13800138000","newPassword":"NewPass123"}'
      2. 验证返回200
      3. 用新密码登录验证成功
    Expected Result: 密码更新成功，可登录
    Evidence: .sisyphus/evidence/task-07-reset-success.log

  Scenario: 密码重置验证失败
    Tool: Bash (curl)
    Steps:
      1. 提交错误email
      2. 验证返回401 + {"error":"信息验证失败"}
    Expected Result: 拒绝重置
    Evidence: .sisyphus/evidence/task-07-reset-fail.log
  ```

  **Commit**: YES
  - Message: `feat(auth): add simplified email verification for password reset`
  - Files: `server/controllers/authController.js`, `server/__tests__/auth/reset-password.test.js`

---

- [ ] 8. 维修工管理API（CRUD）

  **What to do**:
  - 创建`server/controllers/repairmanController.js`
  - 创建`server/routes/repairman.js`路由
  - 实现CRUD接口：
    - POST /api/super-admin/repairman - 添加维修工
    - GET /api/super-admin/repairman - 查询所有维修工
    - PUT /api/super-admin/repairman/:id - 更新维修工
    - DELETE /api/super-admin/repairman/:id - 删除维修工
  - 权限：仅super_admin可访问
  - **TDD**: 先写测试覆盖所有CRUD操作

  **Must NOT do**:
  - 不要允许维修工自己注册
  - 不要暴露密码（返回时exclude password字段）
  - 不要允许删除有未完成订单的维修工

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 完整CRUD实现 + 权限控制
  - **Skills**: [`backend-patterns`]
    - `backend-patterns`: RESTful API设计

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-7, 9-10)
  - **Blocks**: Task 16 (维修工管理UI)
  - **Blocked By**: Task 2 (users表role字段), Task 5 (中间件)

  **References**:
  - `server/controllers/adminController.js` - 参考现有admin API
  - `server/routes/admin.js` - 路由结构参考
  - Draft文档: "维修工管理（超管CRUD）"

  **Acceptance Criteria**:
  - [ ] 4个CRUD接口全部实现
  - [ ] 权限检查：非super_admin返回403
  - [ ] 创建时role自动设为repairman
  - [ ] 删除时检查未完成订单（有则拒绝）
  - [ ] 测试覆盖：所有CRUD + 权限检查

  **QA Scenarios**:
  ```
  Scenario: 添加维修工成功
    Tool: Bash (curl)
    Preconditions: super_admin账号已登录
    Steps:
      1. curl -X POST /api/super-admin/repairman -H "Authorization: Bearer ${TOKEN}" -d '{"username":"repairman1","password":"Pass123","realName":"李师傅","phone":"13900139000"}'
      2. 验证返回201 + repairman记录
      3. 验证users表role='repairman'
    Expected Result: 维修工创建成功
    Evidence: .sisyphus/evidence/task-08-create-repairman.log

  Scenario: 删除有未完成订单的维修工失败
    Tool: Bash (curl)
    Steps:
      1. 创建维修工并分配pending订单
      2. 尝试删除该维修工
      3. 验证返回400 + {"error":"该维修工有未完成订单"}
    Expected Result: 拒绝删除
    Evidence: .sisyphus/evidence/task-08-delete-repairman-fail.log
  ```

  **Commit**: YES
  - Message: `feat(repairman): add CRUD API for super admin`
  - Files: `server/controllers/repairmanController.js`, `server/routes/repairman.js`, `server/__tests__/repairman/`

---

- [ ] 9. 住户管理API（CRUD）

  **What to do**:
  - 创建`server/controllers/residentController.js`
  - 创建`server/routes/resident.js`路由
  - 实现CRUD接口：
    - POST /api/super-admin/resident - 添加住户
    - GET /api/super-admin/resident - 查询所有住户（支持?studentId=搜索）
    - PUT /api/super-admin/resident/:id - 更新住户
    - DELETE /api/super-admin/resident/:id - 删除住户
  - 权限：仅super_admin可访问
  - **TDD**: 先写测试覆盖所有CRUD + 搜索

  **Must NOT do**:
  - 不要允许student_id重复
  - 不要删除已注册账号的住户（检查users表关联）
  - 不要返回过多数据（分页，默认20条）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 完整CRUD + 搜索功能
  - **Skills**: [`backend-patterns`]
    - `backend-patterns`: RESTful API + 搜索模式

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-8, 10)
  - **Blocks**: Task 17 (住户管理UI), Task 10 (Excel导入依赖此API)
  - **Blocked By**: Task 3 (residents表)

  **References**:
  - `server/controllers/adminController.js` - 参考CRUD模式
  - Draft文档: "住户管理（超管CRUD + 搜索）"

  **Acceptance Criteria**:
  - [ ] 4个CRUD接口全部实现
  - [ ] 搜索接口支持studentId参数
  - [ ] 删除时检查users表（已注册则拒绝）
  - [ ] 测试覆盖：CRUD + 搜索 + 约束检查

  **QA Scenarios**:
  ```
  Scenario: 添加住户成功
    Tool: Bash (curl)
    Steps:
      1. curl -X POST /api/super-admin/resident -H "Authorization: Bearer ${TOKEN}" -d '{"studentId":"2023999","name":"测试用户","phone":"13800138000","building":"2栋","roomNumber":"202"}'
      2. 验证返回201
      3. 查询residents表验证数据存在
    Expected Result: 住户添加成功
    Evidence: .sisyphus/evidence/task-09-create-resident.log

  Scenario: 按学号搜索住户
    Tool: Bash (curl)
    Steps:
      1. curl -X GET "/api/super-admin/resident?studentId=2023999" -H "Authorization: Bearer ${TOKEN}"
      2. 验证返回1条记录且studentId匹配
    Expected Result: 搜索结果正确
    Evidence: .sisyphus/evidence/task-09-search-resident.log
  ```

  **Commit**: YES
  - Message: `feat(resident): add CRUD API with search for super admin`
  - Files: `server/controllers/residentController.js`, `server/routes/resident.js`, `server/__tests__/resident/`

---

- [ ] 10. Excel导入API（批量住户导入）

  **What to do**:
  - 扩展`server/controllers/residentController.js`
  - 新增 POST /api/super-admin/resident/import接口
  - 使用multer处理Excel文件上传
  - 使用xlsx或exceljs库解析Excel
  - 批量插入residents表（事务处理）
  - 返回导入结果（成功X条，失败Y条，失败行号）
  - **TDD**: 先写测试覆盖各种Excel场景

  **Must NOT do**:
  - 不要接受>5MB或>5000行的文件
  - 不要逐条插入（批量insert性能）
  - 不要忽略错误（记录失败行号）
  - 不要覆盖已存在的student_id（跳过并记录）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 文件处理+批量导入+错误处理
  - **Skills**: [`backend-patterns`]
    - `backend-patterns`: 文件上传和批量操作模式

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-9)
  - **Blocks**: Task 17 (住户管理UI的导入按钮)
  - **Blocked By**: Task 3 (residents表), Task 9 (基础CRUD)

  **References**:
  - Draft文档: "Excel导入功能（≤5000行，≤5MB）"
  - npm包: xlsx, multer, exceljs

  **Acceptance Criteria**:
  - [ ] POST接口接收multipart/form-data
  - [ ] 文件大小和行数限制生效
  - [ ] 批量导入成功返回{success: X, failed: Y, errors: [...]}
  - [ ] 重复student_id跳过并记录
  - [ ] 测试覆盖：成功导入、文件过大、重复数据

  **QA Scenarios**:
  ```
  Scenario: 批量导入成功
    Tool: Bash (curl)
    Preconditions: 准备test-residents.xlsx（10条有效数据）
    Steps:
      1. curl -X POST /api/super-admin/resident/import -H "Authorization: Bearer ${TOKEN}" -F "file=@test-residents.xlsx"
      2. 验证返回200 + {"success":10,"failed":0}
      3. 查询residents表验证10条数据全部插入
    Expected Result: 批量导入成功
    Evidence: .sisyphus/evidence/task-10-import-success.log

  Scenario: 文件过大拒绝
    Tool: Bash (curl)
    Steps:
      1. 上传6MB文件
      2. 验证返回413 + {"error":"文件大小超过限制（最大5MB）"}
    Expected Result: 拒绝处理
    Evidence: .sisyphus/evidence/task-10-import-toolarge.log

  Scenario: 部分导入失败（重复学号）
    Tool: Bash (curl)
    Steps:
      1. 上传包含已存在student_id的Excel
      2. 验证返回{success:X, failed:Y, errors:[{row:3,reason:"学号已存在"}]}
    Expected Result: 返回详细失败信息
    Evidence: .sisyphus/evidence/task-10-import-partial.log
  ```

  **Commit**: YES
  - Message: `feat(resident): add Excel batch import for residents`
  - Files: `server/controllers/residentController.js`, `server/routes/resident.js`, `server/__tests__/resident/import.test.js`


---

## Wave 3: 订单增强（依赖Wave 2完成）

---

- [ ] 11. 催单功能API（6小时限制）

  **What to do**:
  - 扩展`server/controllers/orderController.js`
  - 新增 POST /api/orders/:id/urge接口
  - 验证：
    - 订单状态为pending
    - 创建时间距今>6小时
    - 该订单未被催过（is_urge=false）
  - 更新：is_urge=true, urge_time=NOW()
  - **TDD**: 先写测试覆盖6小时限制逻辑

  **Must NOT do**:
  - 不要允许processing状态催单
  - 不要允许重复催单（每订单最多1次）
  - 不要允许催别人的订单

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 时间计算+业务规则验证
  - **Skills**: [`backend-patterns`]
    - `backend-patterns`: 业务规则验证模式

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12-14)
  - **Blocks**: Task 18 (订单详情催单UI)
  - **Blocked By**: Task 4 (repairOrders表is_urge字段)

  **References**:
  - `server/controllers/orderController.js` - 现有订单操作
  - Draft文档: "催单功能（6小时限制，每订单最多1次）"

  **Acceptance Criteria**:
  - [ ] POST接口验证时间>6小时
  - [ ] 未到6小时返回400 + {"error":"请等待N小时后再催"}
  - [ ] 已催过返回400 + {"error":"该订单已催促"}
  - [ ] 成功催单返回200 + is_urge=true
  - [ ] 测试覆盖：成功、时间不足、重复催单

  **QA Scenarios**:
  ```
  Scenario: 催单成功
    Tool: Bash (curl)
    Preconditions: 创建7小时前的pending订单
    Steps:
      1. curl -X POST /api/orders/123/urge -H "Authorization: Bearer ${TOKEN}"
      2. 验证返回200 + {"isUrge":true,"urgeTime":"2024-01-01T12:00:00Z"}
      3. 查询repairOrders表验证is_urge=1
    Expected Result: 催单成功
    Evidence: .sisyphus/evidence/task-11-urge-success.log

  Scenario: 6小时内催单失败
    Tool: Bash (curl)
    Preconditions: 创建1小时前的pending订单
    Steps:
      1. curl -X POST /api/orders/124/urge -H "Authorization: Bearer ${TOKEN}"
      2. 验证返回400 + {"error":"请等待5小时后再催","remainingHours":5}
    Expected Result: 拒绝催单并提示剩余时间
    Evidence: .sisyphus/evidence/task-11-urge-time-fail.log
  ```

  **Commit**: YES
  - Message: `feat(order): add urge functionality with 6-hour limit`
  - Files: `server/controllers/orderController.js`, `server/__tests__/order/urge.test.js`

---

- [ ] 12. 撤单功能API（仅pending）

  **What to do**:
  - 扩展`server/controllers/orderController.js`
  - 新增 POST /api/orders/:id/withdraw接口
  - 验证：
    - 订单状态为pending（processing不可撤）
    - 操作者为订单创建者
  - 更新：status='withdrawn'
  - **TDD**: 先写测试覆盖撤单约束

  **Must NOT do**:
  - 不要允许processing状态撤单
  - 不要允许撤别人的订单
  - 不要物理删除（仅改状态）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单的状态更新+权限检查
  - **Skills**: [`backend-patterns`]
    - `backend-patterns`: 状态机模式

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 13-14)
  - **Blocks**: Task 18 (订单详情撤单UI)
  - **Blocked By**: Task 4 (repairOrders表withdrawn状态)

  **References**:
  - `server/controllers/orderController.js` - 现有订单操作
  - Draft文档: "撤单功能（仅pending状态）"

  **Acceptance Criteria**:
  - [ ] POST接口仅接受pending状态
  - [ ] processing状态返回400 + {"error":"维修工已接单，无法撤回"}
  - [ ] 成功撤单返回200 + status='withdrawn'
  - [ ] 测试覆盖：成功、processing拒绝、非创建者拒绝

  **QA Scenarios**:
  ```
  Scenario: 撤单成功
    Tool: Bash (curl)
    Preconditions: 创建pending订单
    Steps:
      1. curl -X POST /api/orders/125/withdraw -H "Authorization: Bearer ${TOKEN}"
      2. 验证返回200 + {"status":"withdrawn"}
      3. 查询repairOrders表验证status='withdrawn'
    Expected Result: 撤单成功
    Evidence: .sisyphus/evidence/task-12-withdraw-success.log

  Scenario: processing状态撤单失败
    Tool: Bash (curl)
    Preconditions: 创建processing订单
    Steps:
      1. curl -X POST /api/orders/126/withdraw -H "Authorization: Bearer ${TOKEN}"
      2. 验证返回400 + {"error":"维修工已接单，无法撤回"}
    Expected Result: 拒绝撤单
    Evidence: .sisyphus/evidence/task-12-withdraw-fail.log
  ```

  **Commit**: YES
  - Message: `feat(order): add withdraw functionality for pending orders`
  - Files: `server/controllers/orderController.js`, `server/__tests__/order/withdraw.test.js`

---

- [ ] 13. 订单列表增强（催促标记筛选）

  **What to do**:
  - 扩展`server/controllers/adminController.js`的getAllOrders
  - 新增查询参数：?isUrge=true 筛选催促订单
  - 返回数据增加：is_urge, urge_time字段
  - 前端催促订单显示红色标记
  - **TDD**: 先写测试覆盖筛选逻辑

  **Must NOT do**:
  - 不要修改现有订单数据结构（仅添加字段）
  - 不要影响现有分页逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单的查询参数扩展
  - **Skills**: [`backend-patterns`]
    - `backend-patterns`: 查询筛选模式

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11-12, 14)
  - **Blocks**: Task 18 (订单列表UI显示催促标记)
  - **Blocked By**: Task 4 (repairOrders表催促字段)

  **References**:
  - `server/controllers/adminController.js:getAllOrders` - 现有实现
  - Draft文档: "订单列表加标记（催促状态筛选）"

  **Acceptance Criteria**:
  - [ ] GET /api/admin/orders?isUrge=true 返回仅催促订单
  - [ ] 返回数据包含is_urge, urge_time
  - [ ] 测试覆盖：筛选和非筛选场景

  **QA Scenarios**:
  ```
  Scenario: 筛选催促订单
    Tool: Bash (curl)
    Preconditions: 创建1个已催订单+2个未催订单
    Steps:
      1. curl -X GET "/api/admin/orders?isUrge=true" -H "Authorization: Bearer ${TOKEN}"
      2. 验证返回1条记录且is_urge=true
    Expected Result: 筛选结果正确
    Evidence: .sisyphus/evidence/task-13-filter-urge.log

  Scenario: 订单列表包含催促字段
    Tool: Bash (curl)
    Steps:
      1. curl -X GET /api/admin/orders -H "Authorization: Bearer ${TOKEN}"
      2. 验证每条记录包含is_urge和urge_time字段
    Expected Result: 字段存在
    Evidence: .sisyphus/evidence/task-13-order-fields.log
  ```

  **Commit**: YES
  - Message: `feat(order): add urge filter and fields to order list`
  - Files: `server/controllers/adminController.js`, `server/__tests__/admin/orders.test.js`

---

- [ ] 14. 双向评价API（先住户后维修工）

  **What to do**:
  - 扩展`server/controllers/orderController.js`
  - 扩展POST /api/orders/:id/evaluate接口（住户评价，保持现有）
  - 新增 POST /api/orders/:id/repairman-evaluate接口（维修工评价）
  - 验证：
    - 住户评价：订单status=completed，未评价过
    - 维修工评价：订单status=completed，住户已评价，7天内
  - 维修工评价字段：repairman_rating, repairman_comment, repairman_evaluated_at
  - **TDD**: 先写测试覆盖双向评价流程和7天窗口

  **Must NOT do**:
  - 不要允许维修工先于住户评价
  - 不要允许7天后继续评价
  - 不要允许重复评价

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 复杂的评价流程控制+时间窗口
  - **Skills**: [`backend-patterns`]
    - `backend-patterns`: 业务流程控制

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11-13)
  - **Blocks**: Task 18 (订单详情评价UI), Task 19 (维修工评价UI)
  - **Blocked By**: Task 4 (evaluations表扩展)

  **References**:
  - `server/controllers/orderController.js` - 现有评价接口
  - Draft文档: "双向评价（先住户后维修工，7天窗口）"

  **Acceptance Criteria**:
  - [ ] 住户评价接口验证订单已完成
  - [ ] 维修工评价接口验证住户已评价
  - [ ] 维修工评价验证7天窗口（超期返回400）
  - [ ] 维修工评价成功写入repairman_rating等3个字段
  - [ ] 测试覆盖：住户评价、维修工评价、顺序错误、7天超期

  **QA Scenarios**:
  ```
  Scenario: 维修工评价成功
    Tool: Bash (curl)
    Preconditions: 订单completed，住户已评价，在7天内
    Steps:
      1. curl -X POST /api/orders/127/repairman-evaluate -H "Authorization: Bearer ${REPAIRMAN_TOKEN}" -d '{"rating":4,"comment":"住户描述准确"}'
      2. 验证返回200
      3. 查询evaluations表验证repairman_rating=4
    Expected Result: 维修工评价成功
    Evidence: .sisyphus/evidence/task-14-repairman-eval-success.log

  Scenario: 维修工评价失败（住户未评价）
    Tool: Bash (curl)
    Preconditions: 订单completed，住户未评价
    Steps:
      1. curl -X POST /api/orders/128/repairman-evaluate -H "Authorization: Bearer ${REPAIRMAN_TOKEN}" -d '{"rating":4,"comment":"..."}'
      2. 验证返回400 + {"error":"住户尚未评价，维修工无法评价"}
    Expected Result: 拒绝评价
    Evidence: .sisyphus/evidence/task-14-repairman-eval-fail.log

  Scenario: 维修工评价失败（7天超期）
    Tool: Bash (curl)
    Preconditions: 订单completed 8天，住户已评价
    Steps:
      1. curl -X POST /api/orders/129/repairman-evaluate -H "Authorization: Bearer ${REPAIRMAN_TOKEN}" -d '{"rating":4,"comment":"..."}'
      2. 验证返回400 + {"error":"评价窗口已关闭（7天）"}
    Expected Result: 拒绝评价
    Evidence: .sisyphus/evidence/task-14-repairman-eval-expired.log
  ```

  **Commit**: YES
  - Message: `feat(evaluation): add dual-direction evaluation with 7-day window`
  - Files: `server/controllers/orderController.js`, `server/__tests__/order/evaluation.test.js`


---

## Wave 4: 前端UI（依赖Wave 3完成）

> 注：微信小程序前端无法通过自动化测试，QA场景使用手动验证+录屏

---

- [ ] 15. 注册页面改造（验证UI）

  **What to do**:
  - 扩展`mini-program/pages/auth/register/`页面
  - 添加5个验证字段输入：学号、姓名、电话、栋数、寝室号
  - 提交前前端验证：电话格式、必填项
  - 错误提示：显示具体不匹配字段
  - 密码重置入口：跳转重置页面

  **Must NOT do**:
  - 不要跳过前端验证（必填、格式）
  - 不要暴露residents表数据（仅返回匹配结果）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 小程序UI+表单交互
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 表单设计和用户体验

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 16-19)
  - **Blocks**: None
  - **Blocked By**: Task 6 (注册验证API), Task 7 (密码重置API)

  **References**:
  - `mini-program/pages/auth/register/` - 现有注册页面
  - Draft文档: "注册验证UI（5字段输入+错误提示）"

  **Acceptance Criteria**:
  - [ ] 页面包含5个输入框（学号、姓名、电话、栋数、寝室号）
  - [ ] 前端验证：电话11位数字、所有字段必填
  - [ ] 验证失败显示具体不匹配字段（红色标记）
  - [ ] 注册成功跳转登录页
  - [ ] 密码重置入口可点击

  **QA Scenarios**:
  ```
  Scenario: 注册验证成功（手动测试）
    Tool: 手动测试（小程序开发者工具）
    Steps:
      1. 填写5个验证字段（匹配residents表数据）
      2. 填写密码
      3. 点击注册
      4. 验证跳转登录页
      5. 用新账号登录成功
    Expected Result: 注册流程完整可用
    Evidence: .sisyphus/evidence/task-15-register-success.mp4

  Scenario: 注册验证失败显示错误（手动测试）
    Tool: 手动测试
    Steps:
      1. 填写错误电话号码
      2. 点击注册
      3. 验证显示"电话号码不匹配"
    Expected Result: 错误提示清晰
    Evidence: .sisyphus/evidence/task-15-register-error.png
  ```

  **Commit**: YES
  - Message: `feat(ui): enhance registration page with resident verification`
  - Files: `mini-program/pages/auth/register/`

---

- [ ] 16. 超管-维修工管理页

  **What to do**:
  - 创建`mini-program/pages/admin/repairman/`页面
  - 维修工列表（显示姓名、电话、状态）
  - 添加/编辑/删除维修工
  - 表单：用户名、密码、姓名、电话
  - 权限检查：仅super_admin可访问

  **Must NOT do**:
  - 不要显示密码（列表和编辑时）
  - 不要允许删除有未完成订单的维修工（API已限制）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 管理后台UI
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 管理后台设计

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15, 17-19)
  - **Blocks**: None
  - **Blocked By**: Task 8 (维修工管理API)

  **References**:
  - `mini-program/pages/admin/` - 现有管理页面结构
  - Draft文档: "维修工管理（超管CRUD）"

  **Acceptance Criteria**:
  - [ ] 维修工列表显示所有维修工
  - [ ] 添加维修工表单（4字段）
  - [ ] 编辑维修工（预填现有数据）
  - [ ] 删除确认对话框
  - [ ] 非super_admin显示403提示

  **QA Scenarios**:
  ```
  Scenario: 添加维修工成功（手动测试）
    Tool: 手动测试
    Steps:
      1. super_admin登录
      2. 进入维修工管理页
      3. 点击添加，填写表单
      4. 提交后列表显示新维修工
    Expected Result: 完整CRUD流程
    Evidence: .sisyphus/evidence/task-16-repairman-crud.mp4
  ```

  **Commit**: YES
  - Message: `feat(ui): add repairman management page for super admin`
  - Files: `mini-program/pages/admin/repairman/`

---

- [ ] 17. 超管-住户管理页（Excel导入）

  **What to do**:
  - 创建`mini-program/pages/admin/resident/`页面
  - 住户列表（显示学号、姓名、电话、栋数、寝室号）
  - 搜索框（按学号搜索）
  - Excel导入按钮（调用wx.chooseMessageFile选择文件）
  - 添加/编辑/删除住户

  **Must NOT do**:
  - 不要显示已注册用户的敏感信息
  - 不要允许删除已注册的住户

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 管理后台UI+文件上传
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 文件上传交互

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15-16, 18-19)
  - **Blocks**: None
  - **Blocked By**: Task 9 (住户管理API), Task 10 (Excel导入API)

  **References**:
  - `mini-program/pages/admin/` - 现有管理页面结构
  - Draft文档: "住户管理（Excel导入+搜索）"

  **Acceptance Criteria**:
  - [ ] 住户列表支持分页（每页20条）
  - [ ] 搜索框实时搜索（输入后自动查询）
  - [ ] Excel导入按钮显示上传进度
  - [ ] 导入结果弹窗显示（成功X条，失败Y条）
  - [ ] CRUD操作正常

  **QA Scenarios**:
  ```
  Scenario: Excel导入成功（手动测试）
    Tool: 手动测试
    Steps:
      1. super_admin登录
      2. 进入住户管理页
      3. 点击"导入Excel"
      4. 选择test-residents.xlsx文件
      5. 验证显示"导入成功：10条"
    Expected Result: 批量导入流程完整
    Evidence: .sisyphus/evidence/task-17-excel-import.mp4

  Scenario: 按学号搜索（手动测试）
    Tool: 手动测试
    Steps:
      1. 在搜索框输入"2023001"
      2. 验证列表仅显示该学号住户
    Expected Result: 搜索功能正常
    Evidence: .sisyphus/evidence/task-17-search.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add resident management page with Excel import`
  - Files: `mini-program/pages/admin/resident/`

---

- [ ] 18. 订单详情页增强（催单+撤单+评价）

  **What to do**:
  - 扩展`mini-program/pages/order/detail/`页面
  - 催单按钮：
    - 仅pending状态显示
    - 未到6小时显示倒计时
    - 点击催单后变灰（已催标记）
  - 撤单按钮：
    - 仅pending状态显示
    - 点击后确认对话框
  - 评价区域：
    - completed状态显示评价表单
    - 住户评价后显示评价结果
  - 催促标记：订单列表中已催订单显示红色角标

  **Must NOT do**:
  - 不要在processing状态显示催单/撤单按钮
  - 不要允许重复催单/撤单

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 复杂的订单详情交互
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 状态驱动的UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15-17, 19)
  - **Blocks**: None
  - **Blocked By**: Tasks 11-14 (催单/撤单/评价API)

  **References**:
  - `mini-program/pages/order/detail/` - 现有订单详情页
  - Draft文档: "订单详情（催单+撤单+评价）"

  **Acceptance Criteria**:
  - [ ] pending状态显示催单按钮
  - [ ] 催单按钮未到6小时显示倒计时
  - [ ] 催单成功后按钮变灰+显示"已催促"
  - [ ] pending状态显示撤单按钮
  - [ ] 撤单确认对话框
  - [ ] completed状态显示评价表单（1-5星+文字）
  - [ ] 订单列表催促订单显示红色角标

  **QA Scenarios**:
  ```
  Scenario: 催单流程（手动测试）
    Tool: 手动测试
    Steps:
      1. 查看7小时前的pending订单
      2. 验证催单按钮可点击
      3. 点击催单，验证显示"已催促"
      4. 返回订单列表，验证红色角标
    Expected Result: 催单功能完整
    Evidence: .sisyphus/evidence/task-18-urge-flow.mp4

  Scenario: 撤单流程（手动测试）
    Tool: 手动测试
    Steps:
      1. 查看pending订单
      2. 点击撤单，确认对话框
      3. 确认后订单消失或状态变为"已撤回"
    Expected Result: 撤单功能完整
    Evidence: .sisyphus/evidence/task-18-withdraw-flow.mp4

  Scenario: 住户评价流程（手动测试）
    Tool: 手动测试
    Steps:
      1. 查看completed订单
      2. 填写评分（4星）+评价文字
      3. 提交后显示"已评价"
    Expected Result: 评价功能完整
    Evidence: .sisyphus/evidence/task-18-evaluation.mp4
  ```

  **Commit**: YES
  - Message: `feat(ui): enhance order detail with urge/withdraw/evaluation`
  - Files: `mini-program/pages/order/detail/`

---

- [ ] 19. 维修工专用页面（接单+完成+评价）

  **What to do**:
  - 创建`mini-program/pages/repairman/`目录
  - 订单列表页：显示所有pending订单（可接单）
  - 我的订单页：显示processing订单（可完成）
  - 订单详情页：
    - 接单按钮（pending订单）
    - 完成按钮（processing订单，需上传完成图片）
    - 评价区域（completed且住户已评价，7天内）

  **Must NOT do**:
  - 不要显示其他维修工的processing订单
  - 不要允许7天后继续评价

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 维修工专用UI
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 角色专属页面设计

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15-18)
  - **Blocks**: None
  - **Blocked By**: Task 14 (双向评价API)

  **References**:
  - `mini-program/pages/admin/` - 参考管理页面结构
  - Draft文档: "维修工专用页面（接单+完成+评价）"

  **Acceptance Criteria**:
  - [ ] pending订单列表可接单
  - [ ] 接单后订单进入"我的订单"
  - [ ] 完成按钮点击后上传图片+确认
  - [ ] completed订单显示评价表单（仅住户已评价且7天内）
  - [ ] 评价成功显示"已评价"

  **QA Scenarios**:
  ```
  Scenario: 维修工接单流程（手动测试）
    Tool: 手动测试
    Steps:
      1. repairman登录
      2. 查看pending订单列表
      3. 点击"接单"，验证订单进入"我的订单"
    Expected Result: 接单流程完整
    Evidence: .sisyphus/evidence/task-19-accept-order.mp4

  Scenario: 维修工完成订单（手动测试）
    Tool: 手动测试
    Steps:
      1. 查看processing订单
      2. 点击"完成"，上传完成图片
      3. 确认后订单状态变为completed
    Expected Result: 完成流程完整
    Evidence: .sisyphus/evidence/task-19-complete-order.mp4

  Scenario: 维修工评价住户（手动测试）
    Tool: 手动测试
    Steps:
      1. 查看completed订单（住户已评价）
      2. 填写评分+评价
      3. 提交后显示"已评价"
    Expected Result: 评价功能完整
    Evidence: .sisyphus/evidence/task-19-repairman-eval.mp4
  ```

  **Commit**: YES
  - Message: `feat(ui): add repairman dedicated pages for order management`
  - Files: `mini-program/pages/repairman/`


---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

---

- [ ] F1. **Plan Compliance Audit** — `oracle`

  **What to do**:
  - Read the plan end-to-end (`.sisyphus/plans/dorm-repair-enhancement.md`)
  - For each "Must Have" in Work Objectives section: verify implementation exists
    - Read files, curl endpoints, run commands to confirm
  - For each "Must NOT Have" (Guardrails): search codebase for forbidden patterns
    - Use grep to find: `role='admin'`, SMTP imports, SMS service calls, etc.
  - Check evidence files exist in `.sisyphus/evidence/`
  - Compare deliverables against plan

  **Output Format**:
  ```
  Must Have [N/N]:
    ✅ 三角色系统: users.role包含student/repairman/super_admin
    ✅ residents验证表: 表存在且字段正确
    ✅ Excel导入: API存在且测试通过
    ...
  Must NOT Have [N/N]:
    ✅ 无真实SMTP: 未找到nodemailer/smtp-transport导入
    ✅ 无短信验证: 未找到SMS SDK导入
    ...
  Tasks [N/N]:
    ✅ Task 1: Jest测试框架已搭建
    ✅ Task 2: users表已扩展
    ...
  VERDICT: APPROVE / REJECT (with reasons)
  ```

  **Recommended Agent Profile**:
  - **Category**: `oracle`
    - Reason: 需要全局视角和规划理解

  **Parallelization**:
  - **Can Run In Parallel**: YES (with F2-F4)
  - **Parallel Group**: Final Wave (with F2-F4)
  - **Blocks**: Final commit
  - **Blocked By**: All implementation tasks (1-19)

  **Acceptance Criteria**:
  - [ ] All "Must Have" features verified as implemented
  - [ ] All "Must NOT Have" patterns confirmed absent
  - [ ] Evidence files checked (at least 80% exist)
  - [ ] Deliverables match plan (no missing items)
  - [ ] Output format followed exactly
  - [ ] VERDICT: APPROVE (or REJECT with clear reasons)

  **QA Scenarios**:
  ```
  Scenario: 计划合规审计通过
    Tool: oracle agent
    Steps:
      1. 读取计划文件
      2. 逐项验证Must Have
      3. 搜索Must NOT Have模式
      4. 检查evidence目录
      5. 输出合规报告
    Expected Result: APPROVE
    Evidence: .sisyphus/evidence/final-f1-compliance-audit.txt
  ```

  **Commit**: NO (verification task)

---

- [ ] F2. **Code Quality Review** — `unspecified-high`

  **What to do**:
  - Run `npm test` and verify all tests pass
  - Run `npm run lint` (if configured) or manual code review
  - Check for common issues in all changed files:
    - `as any` / `@ts-ignore` (TypeScript safety)
    - Empty catch blocks
    - `console.log` in production code
    - Commented-out code
    - Unused imports
  - Check for AI slop patterns:
    - Excessive comments (every line commented)
    - Over-abstraction (unnecessary utility functions)
    - Generic names (data, result, item, temp)
  - Review SQL migrations for safety:
    - No DROP TABLE without backup
    - WHERE clauses on UPDATE/DELETE

  **Output Format**:
  ```
  Build [PASS/FAIL]:
    npm test: N pass, N fail
    npm run lint: PASS/FAIL (or "not configured")
  Files [N clean/N issues]:
    ✅ server/controllers/authController.js: clean
    ⚠️  server/controllers/orderController.js:2 console.log found
    ❌ server/__tests__/order/urge.test.js:15 unused import 'supertest'
  AI Slop Check:
    ✅ No excessive comments
    ✅ No over-abstraction
    ⚠️  Generic name 'data' in line 45
  VERDICT: APPROVE / REJECT (with fix requirements)
  ```

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要仔细的代码审查能力

  **Parallelization**:
  - **Can Run In Parallel**: YES (with F1, F3-F4)
  - **Parallel Group**: Final Wave (with F1, F3-F4)
  - **Blocks**: Final commit
  - **Blocked By**: All implementation tasks (1-19)

  **Acceptance Criteria**:
  - [ ] `npm test` shows 0 failures
  - [ ] No critical code quality issues
  - [ ] AI slop patterns minimal/absent
  - [ ] Output format followed exactly
  - [ ] VERDICT: APPROVE (or REJECT with fix requirements)

  **QA Scenarios**:
  ```
  Scenario: 代码质量检查通过
    Tool: Bash (npm test, grep)
    Steps:
      1. cd server && npm test
      2. grep -r "console.log" server/controllers/
      3. grep -r "as any" server/
      4. 输出质量报告
    Expected Result: APPROVE
    Evidence: .sisyphus/evidence/final-f2-code-quality.txt
  ```

  **Commit**: NO (verification task)

---

- [ ] F3. **Integration Testing** — `unspecified-high`

  **What to do**:
  - Start from clean database state (run migrations on test DB)
  - Execute complete user journeys:
    1. **Registration Flow**: 超管Excel导入住户 → 住户注册验证 → 登录
    2. **Order Lifecycle**: 住户报修 → 维修工接单 → 完成 → 双向评价
    3. **Urge/Withdraw**: 住户报修 → 催单（6小时后） → 撤单（pending状态）
    4. **Admin Management**: 超管添加维修工 → 维修工登录 → 接单
  - Test edge cases:
    - Empty state (无订单时各页面显示)
    - Invalid input (错误电话、超期评价、重复催单)
    - Rapid actions (快速接单、并发操作)
  - Capture evidence (screenshots, logs) to `.sisyphus/evidence/final-qa/`

  **Output Format**:
  ```
  Scenarios [N/N pass]:
    ✅ Registration Flow: 住户注册成功
    ✅ Order Lifecycle: 完整流程通过
    ✅ Urge/Withdraw: 催单+撤单功能正常
    ✅ Admin Management: 超管管理功能正常
  Integration [N/N]:
    ✅ 数据一致性: 订单状态同步正确
    ✅ 权限隔离: 各角色只能访问自己的数据
  Edge Cases [N tested]:
    ✅ 空状态显示正常
    ✅ 无效输入处理正确
    ✅ 快速操作无竞态条件
  VERDICT: APPROVE / REJECT (with failure details)
  ```

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要完整的系统测试能力
  - **Skills**: [`playwright`] (if testing web UI, but this is WeChat mini-program so manual)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with F1-F2, F4)
  - **Parallel Group**: Final Wave (with F1-F2, F4)
  - **Blocks**: Final commit
  - **Blocked By**: All implementation tasks (1-19)

  **Acceptance Criteria**:
  - [ ] All 4 user journeys complete successfully
  - [ ] At least 5 edge cases tested
  - [ ] Evidence captured (logs, screenshots)
  - [ ] No critical integration failures
  - [ ] VERDICT: APPROVE (or REJECT with failure details)

  **QA Scenarios**:
  ```
  Scenario: 完整注册流程测试
    Tool: Bash (curl) + manual
    Steps:
      1. 清空测试数据库
      2. 超管Excel导入10条住户数据
      3. 住户注册（匹配成功）
      4. 住户登录（成功）
    Expected Result: 完整流程通过
    Evidence: .sisyphus/evidence/final-f3-registration-flow.log

  Scenario: 完整订单生命周期测试
    Tool: Bash (curl) + manual
    Steps:
      1. 住户创建订单（pending）
      2. 维修工接单（processing）
      3. 维修工完成（completed）
      4. 住户评价（成功）
      5. 维修工评价（成功）
    Expected Result: 状态流转正确，双向评价成功
    Evidence: .sisyphus/evidence/final-f3-order-lifecycle.log
  ```

  **Commit**: NO (verification task)

---

- [ ] F4. **Scope Fidelity Check** — `deep`

  **What to do**:
  - For each task (1-19): read "What to do" section, read actual implementation (git diff or file content)
  - Verify 1:1 correspondence:
    - Everything in spec was built (no missing features)
    - Nothing beyond spec was built (no scope creep)
  - Check "Must NOT do" compliance for each task
  - Detect cross-task contamination: Task N touching files that belong to Task M
  - Flag unaccounted changes: files modified/created but not mentioned in any task
  - Compare against Guardrails: Excel size limits, time windows, permission checks

  **Output Format**:
  ```
  Tasks [N/N compliant]:
    ✅ Task 1: Jest框架搭建 - 完全符合规划
    ✅ Task 2: users表扩展 - 完全符合规划
    ⚠️  Task 6: 注册验证 - 实现了额外的前端缓存（超出规划）
    ❌ Task 11: 催单功能 - 缺少6小时倒计时显示（规划遗漏）
  Contamination [CLEAN/N issues]:
    ✅ Task 6未修改Task 8的repairmanController.js
    ❌ Task 15修改了authController.js（应属于Task 6）
  Unaccounted [CLEAN/N files]:
    ✅ 所有文件变更均有对应task
    ❌ server/utils/validator.js 新增但未在规划中
  VERDICT: APPROVE / REJECT (with remediation steps)
  ```

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要深入理解规划和实现的对应关系

  **Parallelization**:
  - **Can Run In Parallel**: YES (with F1-F3)
  - **Parallel Group**: Final Wave (with F1-F3)
  - **Blocks**: Final commit
  - **Blocked By**: All implementation tasks (1-19)

  **Acceptance Criteria**:
  - [ ] All tasks checked for spec vs implementation match
  - [ ] No missing features (everything in spec built)
  - [ ] Minimal scope creep (documented if any)
  - [ ] No cross-task contamination (or documented)
  - [ ] No unaccounted file changes
  - [ ] VERDICT: APPROVE (or REJECT with remediation steps)

  **QA Scenarios**:
  ```
  Scenario: 范围保真检查
    Tool: git diff, file read
    Steps:
      1. git log --oneline --all | grep "feat\|fix"
      2. 对每个commit，找到对应的task
      3. 检查文件变更是否在task范围内
      4. 输出保真报告
    Expected Result: APPROVE
    Evidence: .sisyphus/evidence/final-f4-scope-fidelity.txt
  ```

  **Commit**: NO (verification task)

---

## Commit Strategy

> 原子提交，每个功能模块独立commit

### Wave 1 Commits (合并提交)
```bash
# 提交所有基础设施
git add server/package.json server/jest.config.js server/__tests__/setup.js
git add server/sql/migrations/ server/middleware/auth.js
git commit -m "feat(infra): setup Jest testing framework and database migrations for multi-role system

- Add Jest + Supertest for TDD workflow
- Extend users table: role ENUM now includes 'repairman' and 'super_admin', add email field
- Create residents table for registration verification
- Extend repairOrders table: add is_urge, urge_time fields, status includes 'withdrawn'
- Extend evaluations table: add repairman evaluation fields
- Update auth middleware to support three roles

Refs: #1 #2 #3 #4 #5"
```

### Wave 2 Commits (每个API独立提交)
```bash
# 注册验证
git add server/controllers/authController.js server/__tests__/auth/register.test.js
git commit -m "feat(auth): add resident verification for registration

Refs: #6"

# 密码重置
git add server/controllers/authController.js server/__tests__/auth/reset-password.test.js
git commit -m "feat(auth): add simplified email verification for password reset

Refs: #7"

# 维修工管理
git add server/controllers/repairmanController.js server/routes/repairman.js server/__tests__/repairman/
git commit -m "feat(repairman): add CRUD API for super admin

Refs: #8"

# 住户管理
git add server/controllers/residentController.js server/routes/resident.js server/__tests__/resident/
git commit -m "feat(resident): add CRUD API with search for super admin

Refs: #9"

# Excel导入
git add server/controllers/residentController.js server/routes/resident.js server/__tests__/resident/import.test.js
git commit -m "feat(resident): add Excel batch import for residents

Refs: #10"
```

### Wave 3 Commits (每个功能独立提交)
```bash
# 催单
git add server/controllers/orderController.js server/__tests__/order/urge.test.js
git commit -m "feat(order): add urge functionality with 6-hour limit

Refs: #11"

# 撤单
git add server/controllers/orderController.js server/__tests__/order/withdraw.test.js
git commit -m "feat(order): add withdraw functionality for pending orders

Refs: #12"

# 订单列表增强
git add server/controllers/adminController.js server/__tests__/admin/orders.test.js
git commit -m "feat(order): add urge filter and fields to order list

Refs: #13"

# 双向评价
git add server/controllers/orderController.js server/__tests__/order/evaluation.test.js
git commit -m "feat(evaluation): add dual-direction evaluation with 7-day window

Refs: #14"
```

### Wave 4 Commits (每个页面独立提交)
```bash
# 注册页面
git add mini-program/pages/auth/register/
git commit -m "feat(ui): enhance registration page with resident verification

Refs: #15"

# 维修工管理页
git add mini-program/pages/admin/repairman/
git commit -m "feat(ui): add repairman management page for super admin

Refs: #16"

# 住户管理页
git add mini-program/pages/admin/resident/
git commit -m "feat(ui): add resident management page with Excel import

Refs: #17"

# 订单详情页
git add mini-program/pages/order/detail/
git commit -m "feat(ui): enhance order detail with urge/withdraw/evaluation

Refs: #18"

# 维修工页面
git add mini-program/pages/repairman/
git commit -m "feat(ui): add repairman dedicated pages for order management

Refs: #19"
```

### Final Commit (所有验证通过后)
```bash
# 合并到主分支
git checkout main
git merge feature/dorm-repair-enhancement

# 打tag
git tag -a v2.0.0 -m "Multi-role dorm repair system with resident verification, Excel import, urge/withdraw, and dual evaluation"
git push origin main --tags
```

---

## Success Criteria

### Verification Commands

```bash
# 1. 测试通过
cd server && npm test
# Expected: N pass, 0 fail, Coverage ≥ 80%

# 2. 数据库迁移成功
mysql -u root -p xiong_bi -e "SHOW TABLES;"
# Expected: residents表存在

mysql -u root -p xiong_bi -e "SHOW COLUMNS FROM users WHERE Field='role';"
# Expected: Type包含 'student', 'repairman', 'super_admin'

# 3. 角色系统正常
curl -X POST http://localhost:3000/api/auth/login -d '{"username":"admin","password":"admin123"}'
# Expected: 返回token，role='super_admin'

# 4. API功能验证
curl -X GET http://localhost:3000/api/admin/orders?isUrge=true -H "Authorization: Bearer ${TOKEN}"
# Expected: 返回催促订单列表

# 5. 前端页面可访问
# 打开微信开发者工具，编译小程序，验证以下页面：
# - 注册页面显示5个验证字段
# - 超管看到维修工管理和住户管理菜单
# - 订单详情页显示催单/撤单/评价按钮
# - 维修工看到专用页面
```

### Final Checklist

- [ ] **数据库层**
  - [ ] 4个迁移文件全部执行成功
  - [ ] users表包含3种角色+email字段
  - [ ] residents表存在且约束生效
  - [ ] repairOrders表包含催促字段
  - [ ] evaluations表包含维修工评价字段

- [ ] **后端API**
  - [ ] 15+ API接口功能完整
  - [ ] 所有接口TDD测试通过
  - [ ] 权限检查正确（3角色隔离）
  - [ ] 测试覆盖率 ≥ 80%

- [ ] **前端UI**
  - [ ] 注册页面验证流程正常
  - [ ] 超管可管理维修工和住户
  - [ ] Excel导入功能正常
  - [ ] 催单/撤单/评价交互正常
  - [ ] 维修工专用页面可用

- [ ] **业务逻辑**
  - [ ] 三角色系统完整运行
  - [ ] 注册验证5字段匹配
  - [ ] 催单6小时限制生效
  - [ ] 撤单仅pending状态
  - [ ] 双向评价顺序正确
  - [ ] 7天评价窗口生效

- [ ] **代码质量**
  - [ ] `npm test`全部通过
  - [ ] 无console.log/any type
  - [ ] 无AI slop patterns
  - [ ] 提交信息清晰

- [ ] **文档和证据**
  - [ ] API文档已更新
  - [ ] Evidence文件完整（至少80%场景）
  - [ ] Git提交历史清晰

---

**计划完成时间**: 预计 5-7 个工作日（Wave 1: 1天, Wave 2: 2天, Wave 3: 1天, Wave 4: 2天, Final: 1天）

**风险提示**:
- 微信小程序前端无法自动化测试，需手动验证
- Excel导入依赖第三方库（xlsx/exceljs），需提前评估
- 数据库迁移需在生产环境谨慎执行（先备份）

**下一步**: 运行 `/start-work dorm-repair-enhancement` 开始执行计划

