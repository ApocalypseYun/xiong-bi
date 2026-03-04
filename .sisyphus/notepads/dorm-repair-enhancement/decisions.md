# 决策记录 - 宿舍报修系统增强

## 2026-03-04: 多角色系统数据库迁移设计

### 决策：迁移文件编号策略
- **选择**: 使用三位数字编号（001, 002, 003...）
- **理由**: 
  - 清晰的执行顺序
  - 易于管理和追踪
  - 支持未来扩展（可插入中间迁移）
- **影响**: 后续迁移文件需按顺序编号

### 决策：角色系统设计
- **选择**: 三角色体系 `('student', 'repairman', 'super_admin')`
- **理由**:
  - `student`: 保持原有学生角色
  - `repairman`: 新增修理工角色，可接单、完成订单
  - `super_admin`: 原 admin 升级，拥有系统管理权限
- **影响**: 
  - 现有 admin 用户需升级为 super_admin
  - 需更新所有权限检查逻辑

### 决策：email 字段设计
- **选择**: 添加为 NULLABLE 字段
- **理由**:
  - 现有用户可能没有邮箱
  - 渐进式迁移策略
  - 未来可添加邮箱验证功能
- **影响**: 
  - 注册时 email 为可选
  - 未来可添加邮箱唯一性约束

### 决策：迁移测试策略
- **选择**: 编写状态验证测试而非执行测试
- **理由**:
  - 不破坏生产数据
  - 验证迁移后状态而非执行过程
  - 可重复执行
- **影响**: 
  - 需要在测试数据库上手动执行迁移
  - 测试关注结果而非过程

### 技术约束
1. MySQL 不支持直接修改 ENUM，需使用 MODIFY COLUMN
2. 迁移文件不应删除现有数据
3. 所有结构变更必须可回滚

### 后续任务依赖
- Task 2: residents 表创建
- Task 3: repairman 管理表
- Task 5: 权限中间件更新
- Task 6-19: 所有基于新角色的功能

---

## 2026-03-04: 订单增强迁移设计 (Task 3)

### 决策：催单字段设计
- **选择**: `is_urge` (BOOLEAN) + `urge_time` (DATETIME)
- **理由**:
  - 布尔值便于快速查询
  - 时间戳记录最后催单时间，用于间隔计算
  - 支持未来扩展催单次数统计
- **影响**: 
  - 需在业务层实现 6 小时限制逻辑
  - 需创建复合索引 (is_urge, urge_time) 优化查询

### 决策：撤单状态设计
- **选择**: 在 status ENUM 中添加 'withdrawn' 状态
- **理由**:
  - 保持状态历史完整性
  - 区分于 pending/completed
  - 便于统计和审计
- **约束**:
  - 仅 pending 状态可撤单
  - processing/completed 不可撤（业务层强制）

### 决策：双向评价字段设计
- **选择**: 在 evaluations 表添加修理工评价字段
  - `repairman_rating` (TINYINT, 1-5)
  - `repairman_comment` (TEXT)
  - `repairman_evaluated_at` (DATETIME)
- **理由**:
  - 复用现有 evaluations 表结构
  - 避免创建新表
  - 保持数据模型简洁
- **评价流程**: 住户先评 → 订单 completed → 修理工可评

### 决策：CHECK 约束
- **选择**: 添加 `chk_repairman_rating` 约束
- **理由**:
  - 数据库层面保证评分有效性
  - 双向保障（业务层 + 数据库层）

### 数据完整性
- 现有 repairOrders: is_urge=FALSE, urge_time=NULL
- 现有 evaluations: repairman 字段均为 NULL
- 迁移不破坏任何现有数据

---

## 2026-03-04: residents 表迁移设计 (Task 2)

### 决策：residents 表独立性
- **选择**: residents 表完全独立，无外键关联 users 表
- **理由**:
  - residents 仅用于注册验证，不存储业务数据
  - 避免级联删除风险
  - 支持批量导入/更新而不影响用户数据
- **验证逻辑**: 注册时 5 字段必须全部匹配（学号+姓名+电话+栋数+寝室号）

### 决策：字段命名与类型
- **主键**: `id` (INT AUTO_INCREMENT) 而非 `resident_id`
  - 理由：与 MySQL 惯例保持一致，简洁明了
- **学号**: `student_id` (VARCHAR(50) UNIQUE NOT NULL)
  - 支持多种学号格式（数字/字母混合）
  - UNIQUE 约束确保无重复
- **必填字段**: name, phone, building, room_number 均为 NOT NULL
  - 验证要求：5 字段必须完整

### 决策：索引策略
- **idx_student**: 单列索引（student_id）
  - 高频查询：按学号验证
  - UNIQUE 约束自动创建索引，idx_student 为冗余但无害
- **idx_room**: 复合索引（building, room_number）
  - 支持按楼栋+寝室号批量查询
  - 优化 Excel 导入时的查重逻辑

### 决策：测试数据库策略
- **创建**: `dormitory_repair_test` 独立测试数据库
- **数据隔离**: 
  - 测试数据库完全独立于生产数据库
  - 每次测试运行后清理测试数据
- **迁移执行**: 
  - 先运行 init.sql（基础表结构）
  - 再运行迁移文件（001, 002...）

### 测试覆盖
- ✓ 表存在性验证
- ✓ 字段结构验证（6 核心字段 + created_at）
- ✓ UNIQUE 约束验证（student_id 不允许重复）
- ✓ PRIMARY KEY 验证（id 自增）
- ✓ 索引验证（idx_student, idx_room）

### 后续依赖
- Task 6: 注册验证逻辑需查询 residents 表
- Task 10: Excel 导入需写入 residents 表
