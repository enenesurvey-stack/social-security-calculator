# 五险一金计算器

一个基于 Next.js 和 Supabase 的企业社保公积金计算Web应用。

## 功能特性

- 🔐 **用户认证**：支持邮箱注册登录，数据隔离
- 📊 **数据上传**：支持Excel文件批量上传城市标准和员工工资数据
- 🧮 **智能计算**：自动计算员工社保公积金缴纳金额
- 📈 **数据可视化**：提供多种图表展示计算结果
- 📋 **结果管理**：支持查询、筛选、导出计算结果
- 🏙️ **城市管理**：灵活管理不同城市的社保标准

## 技术栈

- **前端框架**：Next.js 14 (App Router)
- **UI组件**：Tailwind CSS + Radix UI
- **数据库**：Supabase (PostgreSQL)
- **认证**：Supabase Auth
- **图表**：Chart.js + react-chartjs-2
- **文件处理**：xlsx
- **导出功能**：react-csv

## 快速开始

### 1. 环境准备

确保你的开发环境已安装：
- Node.js 18+
- npm 或 yarn

### 2. 克隆项目

```bash
git clone <repository-url>
cd social-security-calculator
```

### 3. 安装依赖

```bash
npm install
```

### 4. 设置 Supabase

1. 访问 [Supabase](https://supabase.com) 创建新项目
2. 在项目的 SQL 编辑器中执行 `supabase/schema.sql` 中的SQL语句
3. 获取以下信息：
   - Project URL
   - anon public key
   - service_role key

### 5. 配置环境变量

复制 `.env.local` 文件并填入你的 Supabase 配置：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

NEXT_PUBLIC_APP_NAME=五险一金计算器
NEXT_PUBLIC_APP_DESCRIPTION=企业社保公积金计算工具
```

### 6. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 使用指南

### 1. 用户注册登录
- 访问 `/auth` 页面进行注册或登录
- 注册后需要验证邮箱（可选配置）

### 2. 上传数据

#### 城市标准数据
- 访问 `/upload` 页面
- 上传包含城市社保标准的Excel文件
- 必需字段：`id`, `city_name`, `year`, `rate`, `base_min`, `base_max`

#### 员工工资数据
- 在同一页面上传员工工资数据
- 必需字段：`id`, `employee_id`, `employee_name`, `month`, `salary_amount`

### 3. 执行计算
- 在 `/upload` 页面选择城市和月份范围
- 点击"执行计算并存储结果"
- 系统将自动计算并保存结果

### 4. 查看结果
- 访问 `/results` 页面查看计算结果
- 支持搜索、筛选、排序
- 可导出CSV格式数据

### 5. 数据分析
- 访问 `/dashboard` 页面查看统计图表
- 包括城市费用分布、员工费用排名、费用构成分析等

### 6. 城市管理
- 访问 `/cities` 页面管理城市标准
- 支持新增、编辑、删除城市数据
- 支持批量导入

## 数据库结构

### cities 表（城市标准）
- `id`: 城市ID
- `city_name`: 城市名称
- `year`: 年份
- `rate`: 缴纳比例
- `base_min`: 缴费基数下限
- `base_max`: 缴费基数上限
- `company_id`: 所属公司（用户ID）

### salaries 表（员工工资）
- `id`: 记录ID
- `employee_id`: 员工工号
- `employee_name`: 员工姓名
- `yearmonth`: 月份（YYYYMM格式）
- `salary_amount`: 工资金额
- `company_id`: 所属公司（用户ID）

### results 表（计算结果）
- `id`: 记录ID
- `city_name`: 城市名称
- `yearmonth_start`: 计算起始月份
- `yearmonth_end`: 计算结束月份
- `employee_name`: 员工姓名
- `avg_salary`: 平均工资
- `contribution_base`: 缴费基数
- `company_fee`: 公司缴纳金额
- `rate`: 缴纳比例
- `created_by`: 创建者（用户ID）

## 计算逻辑

1. **平均工资计算**：按员工计算指定月份范围内的平均工资
2. **基数确定**：
   - 平均工资 < 基数下限 → 使用基数下限
   - 平均工资 > 基数上限 → 使用基数上限
   - 其他情况 → 使用平均工资
3. **公司缴费**：缴费基数 × 缴纳比例

## 部署

### Vercel 部署（推荐）

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 自动部署完成

### 其他平台

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 开发指南

### 项目结构

```
src/
├── app/                # Next.js App Router 页面
│   ├── auth/          # 认证页面
│   ├── dashboard/     # 统计图表
│   ├── upload/        # 数据上传
│   ├── results/       # 结果查询
│   └── cities/        # 城市管理
├── components/        # React 组件
│   ├── ui/           # 基础UI组件
│   ├── forms/        # 表单组件
│   └── charts/       # 图表组件
├── lib/              # 工具库
│   ├── supabase/     # Supabase 配置
│   ├── utils/        # 通用工具
│   └── calculations/ # 计算逻辑
└── types/            # TypeScript 类型定义
```

### 添加新功能

1. 在相应目录创建组件或页面
2. 更新类型定义（如需要）
3. 添加相应的 API 路由
4. 更新数据库结构（如需要）

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
