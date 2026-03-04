# 数据库迁移系统

## 概述

本目录包含宿舍报修系统的数据库迁移文件，用于管理数据库结构的版本演进。

## 迁移文件命名规范

```
NNN_description.sql
```

- `NNN`: 三位数字编号（001, 002, 003...）
- `description`: 简短描述，使用下划线分隔

## 执行迁移

### 1. 检查当前数据库状态

```bash
mysql -u root -p dormitory_repair -e "SELECT userId, username, role, email FROM users LIMIT 5;"
```

### 2. 执行迁移

```bash
# 执行特定迁移
mysql -u root -p dormitory_repair < server/sql/migrations/001_multi_role_system.sql
```

### 3. 验证迁移结果

```bash
# 运行迁移测试
cd server
npm test -- __tests__/migrations/001.test.js
```

## 迁移历史

| 编号 | 文件名 | 日期 | 描述 |
|-----|-------|------|------|
| 001 | 001_multi_role_system.sql | 2026-03-04 | 多角色系统：扩展 role 字段，添加 email 字段 |

## 最佳实践

1. **执行前备份**：执行迁移前务必备份数据库
   ```bash
   mysqldump -u root -p dormitory_repair > backup_$(date +%Y%m%d).sql
   ```

2. **测试先行**：在测试数据库上先执行迁移和测试

3. **版本控制**：所有迁移文件都应提交到 Git

4. **不可变原则**：已执行的迁移文件不应修改

## 回滚策略

每个迁移应考虑回滚方案。如果需要回滚：

```sql
-- 示例：回滚 001 迁移
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users MODIFY COLUMN role ENUM('student', 'admin') DEFAULT 'student';
UPDATE users SET role = 'admin' WHERE role = 'super_admin';
ALTER TABLE users DROP INDEX idx_email;
```

## 故障排查

### 迁移失败：字段已存在

```
ERROR 1060 (42S21): Duplicate column name 'email'
```

**解决方案**：迁移已执行，检查数据库状态或跳过此迁移。

### 迁移失败：外键约束

```
ERROR 1828 (HY000): Cannot drop column 'xxx': needed in a foreign key constraint
```

**解决方案**：先删除外键约束，执行迁移，再重建约束。

## 相关文件

- `server/sql/init.sql`: 初始数据库结构
- `server/__tests__/migrations/`: 迁移测试文件
- `server/config/database.js`: 数据库连接配置
