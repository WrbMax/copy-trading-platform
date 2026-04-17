# 数字货币全自动跟单系统 — 产品说明文档

> **版本：** v1.5（2026-04-17）
> **仓库：** https://github.com/WrbMax/copy-trading-platform
> **生产地址：** https://winningwin.pro

---

## 目录

1. [产品概述](#1-产品概述)
2. [用户端功能说明](#2-用户端功能说明)
3. [管理后台功能说明](#3-管理后台功能说明)
4. [核心业务逻辑](#4-核心业务逻辑)
5. [技术架构](#5-技术架构)
6. [数据库表结构](#6-数据库表结构)
7. [多交易所仓位换算规则](#7-多交易所仓位换算规则)
8. [多级收益分成逻辑](#8-多级收益分成逻辑)
9. [充值与资金流转](#9-充值与资金流转)
10. [生产环境部署指南](#10-生产环境部署指南)
11. [常见问题与排查](#11-常见问题与排查)
12. [变更记录](#12-变更记录)

---

## 1. 产品概述

**数字货币全自动跟单系统**是一个面向加密货币衍生品交易的高性能自动化跟单平台。其核心价值在于将专业交易员（信号源）的交易策略实时、精准地复制到普通用户的独立交易所账户中，同时通过多级分销和自动化利润分成机制，实现平台、交易员、推广者和用户的多方共赢。

系统支持**跨交易所跟单**，信号源在 OKX 交易，用户可在 Binance、OKX、Bybit、Bitget、Gate.io 等主流交易所自动执行对应比例的订单。

### 核心特点

| 特点 | 说明 |
|---|---|
| **跨交易所** | 信号源 OKX，跟单支持 Binance / OKX / Bybit / Bitget / Gate.io |
| **毫秒级响应** | OKX WebSocket 私有频道实时监听，信号到下单延迟极低 |
| **自定义倍数** | 用户可设置 0.1x ~ 100x 跟单倍数，灵活控制仓位大小 |
| **多级分成** | 差额多级收益分成，支持无限层级推荐链 |
| **自动充值** | BSC 链 USDT 自动到账，BSCScan + RPC 双重检测防漏单 |
| **AES 加密** | 用户交易所 API Key 采用 AES-256-GCM 加密存储 |
| **积分系统** | 亏损用户可将净亏损兑换积分，积分可在用户间转让 |

---

## 2. 用户端功能说明

用户登录后可访问以下页面（左侧导航菜单）：

### 2.1 首页（Dashboard）

**路由：** `/`

展示用户账户的核心数据概览：

- **账户余额**（USDT）：平台内余额，用于支付服务费
- **累计盈利**：所有已平仓订单的净盈亏总和
- **平台扣费**：已被平台收取的服务费总额
- **持仓中订单数**：当前未平仓的跟单数量
- **当前开启的策略**：已激活的跟单策略列表及实时状态

### 2.2 策略中心（Strategy）

**路由：** `/strategy`

用户在此页面管理跟单策略：

1. 查看所有可用信号源（名称、交易对、参考仓位、预期月化收益）
2. 选择已绑定的交易所 API
3. 设置跟单倍数（0.1x ~ 100x）
4. 开启 / 关闭策略

**开启策略前置条件：**
- 账户余额 > 0（余额不足时系统拒绝开启并提示充值）
- 已绑定对应交易所的 API Key

### 2.3 订单记录（Orders）

**路由：** `/orders`

逐笔展示所有跟单订单，每笔开仓和平仓分别显示一行，方便用户与交易所历史记录核对：

| 字段 | 说明 |
|---|---|
| ID | 系统内部订单 ID |
| 交易所 | binance / okx / bybit / bitget / gate |
| 方向 | 开多 / 开空 / 平多 / 平空 |
| 数量 | 以 ETH 为单位的实际成交数量 |
| 倍数 | 用户设置的跟单倍数 |
| 成交价 | 开仓价或平仓价 |
| 手续费 | 交易所收取的手续费（USDT） |
| 已实现盈亏 | 仅平仓单显示，来自交易所 API 真实数据 |
| 净盈亏 | 仅平仓单显示，已实现盈亏 - 手续费 |
| 状态 | 持仓中 / 已平仓 / 失败 |

### 2.4 我的收益（Earnings）

**路由：** `/earnings`

展示用户的收益分成明细（作为推荐人收到的分成）：

- 累计分成收入总额
- 逐笔分成记录（来自哪个下级用户、哪笔订单、金额）

### 2.5 团队收益（Team）

**路由：** `/team`

展示用户邀请的下级成员列表及其跟单数据：

- 下级用户名、邮箱、注册时间
- 各下级的累计盈利、平台扣费
- 从各下级获得的分成金额

### 2.6 充值提现（Funds）

**路由：** `/funds`

**充值：**
- 显示用户专属 BSC（BEP-20）USDT 充值地址
- 支持扫码或复制地址
- 可手动提交交易哈希，由管理员审核入账

**提现：**
- 填写提现地址（BSC 链）和金额
- 最低提现金额限制（由管理员配置）
- 提交后等待管理员审核打款

**记录：**
- 查看所有充值和提现历史

### 2.7 积分中心（Points）

**路由：** `/points`

**积分获取：**
- 当用户有净亏损时，可将亏损金额（USDT）按 1:1 比例兑换为积分
- 每 30 天最多兑换一次
- 兑换后净亏损清零（余额不变）

**积分转让：**
- 可通过邀请码将积分转让给其他用户
- 积分可用于平台内部兑换（具体规则由运营决定）

### 2.8 API 绑定（ExchangeApi）

**路由：** `/exchange-api`

用户在此绑定各交易所的 API Key：

| 支持交易所 | 所需字段 |
|---|---|
| Binance | API Key + Secret Key |
| OKX | API Key + Secret Key + Passphrase |
| Bybit | API Key + Secret Key |
| Bitget | API Key + Secret Key + Passphrase |
| Gate.io | API Key + Secret Key |

**安全说明：**
- API Key 使用 AES-256-GCM 加密存储，平台无法以明文查看
- 绑定时系统自动进行连通性测试，失败则拒绝保存
- 建议用户只开启"合约交易"权限，禁止提现权限

### 2.9 邀请好友（Invite）

**路由：** `/invite`

- 展示用户专属邀请码和邀请链接
- 可复制邀请链接分享给好友
- 新用户注册必须填写邀请码，注册后自动建立推荐关系

---

## 3. 管理后台功能说明

管理员（role = admin）登录后可访问后台管理页面（路由前缀 `/admin`）：

### 3.1 仪表盘（AdminDashboard）

**路由：** `/admin`

平台整体运营数据概览：

- 总用户数、今日新增用户
- 平台总收入（所有服务费之和）
- 总充值金额、总提现金额
- 平台余额（主钱包 USDT 余额）
- 最近订单、最近充值记录

### 3.2 用户管理（AdminUsers）

**路由：** `/admin/users`

管理所有用户：

- 搜索用户（ID / 用户名 / 邮箱）
- 查看用户余额、分成比例、注册时间
- **增加 / 扣减余额**：手动调整用户平台余额
- **设置分成比例**：设置该用户被扣除的服务费比例（0% ~ 70%）
- **查看充提记录**：查看该用户的所有资金流水、充值、提现记录
- **查看交易订单**：查看该用户的所有跟单订单，含统计摘要（总订单、持仓中、累计盈利、平台扣费）
- **查看邀请成员**：展开查看该用户邀请的下级列表

### 3.3 信号源管理（AdminSignalSources）

**路由：** `/admin/signals`

管理跟单信号源：

- 新增信号源（名称、交易对、OKX API Key/Secret/Passphrase、参考仓位、预期月化）
- 启用 / 禁用信号源
- 删除信号源
- 查看信号源当前连接状态（WS 是否已登录、是否已订阅）

### 3.4 订单监控（AdminOrders）

**路由：** `/admin/orders`

查看所有用户的跟单订单：

- 筛选：按用户、交易所、方向、状态、是否异常
- 标记异常订单（黄色感叹号图标）
- 查看每笔订单的完整信息（用户、信号源、交易所、交易对、方向、数量、倍数、成交价、手续费、已实现盈亏、净盈亏、状态）

### 3.5 资金管理（AdminFunds）

**路由：** `/admin/funds`

**充值审核：**
- 查看所有待审核的充值申请
- 确认入账 / 拒绝

**提现审核：**
- 查看所有待审核的提现申请
- 批准（填写交易哈希）/ 拒绝

**HD 钱包管理：**
- 初始化 HD 钱包（生成助记词和主地址）
- 查看主钱包地址和 BNB/USDT 余额
- 一键归集：将所有子地址的 USDT 归集到主钱包

### 3.6 积分管理（AdminPoints）

**路由：** `/admin/points`

- 查看所有用户的积分余额
- 手动增加 / 扣减用户积分
- 查看积分流水记录

### 3.7 收益分成（AdminRevenueShare）

**路由：** `/admin/revenue-share`

- 查看所有收益分成记录（来自哪个用户、哪笔订单、分给哪个推荐人、金额）
- 统计各推荐人累计获得的分成总额

---

## 4. 核心业务逻辑

### 4.1 用户注册与邀请体系

所有新用户注册必须填写邀请码，系统自动建立 `referrerId` 推荐关系树。注册时：

1. 验证邀请码有效性
2. 创建用户，生成专属邀请码（6位随机字母数字）
3. 记录 `referrerId`（推荐人 ID）
4. 发送邮箱验证码（可选）

### 4.2 跟单引擎工作流程

```
OKX WebSocket 私有频道
        ↓
  监听信号源账户仓位变化
        ↓
  解析变化方向和数量
        ↓
  查询所有启用该信号源的用户策略
        ↓
  并发调用各用户对应交易所 API 下单
        ↓
  记录订单到数据库
        ↓
  平仓后查询交易所 API 获取真实 PnL
        ↓
  触发多级收益分成计算
```

**信号时效性校验：** 信号发出后 30 秒内有效，超时丢弃，防止极端行情下的滑点风险。

**并发控制：** 引擎使用 `Promise.allSettled` 并发下单，单个用户失败不影响其他用户。

### 4.3 订单状态机

```
[信号到达]
    ↓
  open（持仓中）← 开仓成功
    ↓
  closed（已平仓）← 平仓成功，PnL 已结算
    ↓
  failed（失败）← 开仓或平仓失败
```

### 4.4 盈亏数据来源

各交易所盈亏数据获取方式：

| 交易所 | PnL 获取方式 |
|---|---|
| **Binance** | 平仓后查询 `/fapi/v1/userTrades`，取 `realizedPnl` |
| **OKX** | 平仓后查询 `/api/v5/trade/fills`，取 `pnl` |
| **Bybit** | 平仓后查询 `/v5/position/closed-pnl`，含重试机制（最多 5 次，间隔 2s）|
| **Bitget** | 平仓后查询订单详情，取 `pnl` |
| **Gate.io** | 平仓后查询订单详情，取 `pnl` |

---

## 5. 技术架构

### 5.1 技术栈

| 模块 | 技术选型 | 说明 |
|---|---|---|
| **前端框架** | React 18 + Vite | SPA 单页应用 |
| **UI 组件库** | shadcn/ui + Tailwind CSS | 暗色主题，响应式设计 |
| **前后端通信** | tRPC | 端到端类型安全的 API |
| **后端框架** | Node.js + Express | HTTP 服务 |
| **数据库 ORM** | Drizzle ORM | 类型安全的 SQL 查询 |
| **数据库** | MySQL / MariaDB | 关系型数据存储 |
| **进程管理** | PM2 | 高可用，崩溃自动重启 |
| **Web 服务器** | Nginx | 反向代理，HTTPS |
| **实时通信** | WebSocket（ws 库）| 连接 OKX 私有频道 |
| **加密** | AES-256-GCM | API Key 加密存储 |
| **区块链** | ethers.js | BSC 钱包派生和 USDT 转账 |

### 5.2 项目目录结构

```
copy-trading-platform/
├── client/                    # 前端代码
│   └── src/
│       ├── pages/             # 页面组件
│       │   ├── Dashboard.tsx  # 首页
│       │   ├── Strategy.tsx   # 策略中心
│       │   ├── Orders.tsx     # 订单记录
│       │   ├── Earnings.tsx   # 我的收益
│       │   ├── Team.tsx       # 团队收益
│       │   ├── Funds.tsx      # 充值提现
│       │   ├── Points.tsx     # 积分中心
│       │   ├── ExchangeApi.tsx# API 绑定
│       │   ├── Invite.tsx     # 邀请好友
│       │   └── admin/         # 管理后台页面
│       └── components/        # 公共组件
├── server/                    # 后端代码
│   ├── copy-engine.ts         # 跟单引擎（核心）
│   ├── db.ts                  # 数据库操作层
│   ├── revenue-share.ts       # 收益分成计算
│   ├── bsc-wallet.ts          # BSC 钱包模块
│   ├── binance-client.ts      # Binance API 客户端
│   ├── okx-client.ts          # OKX API 客户端
│   ├── bybit-client.ts        # Bybit API 客户端
│   ├── bitget-client.ts       # Bitget API 客户端
│   ├── gate-client.ts         # Gate.io API 客户端
│   ├── email.ts               # 邮件发送
│   ├── crypto.ts              # AES 加解密工具
│   └── routers/               # tRPC 路由
│       ├── auth.ts            # 认证（登录/注册）
│       ├── strategy.ts        # 策略管理
│       ├── exchange.ts        # 交易所 API 管理
│       ├── funds.ts           # 资金管理
│       ├── points.ts          # 积分系统
│       └── user.ts            # 用户管理（含管理员接口）
├── drizzle/                   # 数据库迁移文件
│   └── schema.ts              # 数据库 Schema 定义
├── dist/                      # 构建产物（不提交到 git）
│   ├── index.js               # 后端编译产物
│   └── public/                # 前端静态文件
├── ecosystem.config.cjs       # PM2 启动配置
└── package.json
```

---

## 6. 数据库表结构

### users — 用户表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 用户 ID |
| openId | VARCHAR | OAuth 登录 ID（可空） |
| name | VARCHAR | 用户名 |
| email | VARCHAR | 邮箱（唯一） |
| loginMethod | VARCHAR | 登录方式（email/oauth） |
| role | VARCHAR | 角色（user/admin） |
| passwordHash | VARCHAR | 密码哈希 |
| inviteCode | VARCHAR | 专属邀请码（唯一） |
| referrerId | INT | 推荐人 ID（外键 users.id） |
| balance | DECIMAL | 平台余额（USDT） |
| points | INT | 积分余额 |
| totalProfit | DECIMAL | 累计净盈利 |
| totalLoss | DECIMAL | 累计净亏损 |
| lastPointsRedeemMonth | VARCHAR | 上次积分兑换月份 |
| revenueShareRatio | DECIMAL | 服务费比例（%） |
| isActive | BOOLEAN | 账户是否启用 |
| createdAt | DATETIME | 注册时间 |
| updatedAt | DATETIME | 更新时间 |
| lastSignedIn | DATETIME | 最后登录时间 |

### exchange_apis — 交易所 API 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | API ID |
| userId | INT | 所属用户 ID |
| exchange | VARCHAR | 交易所（binance/okx/bybit/bitget/gate） |
| label | VARCHAR | 用户自定义标签 |
| apiKey | VARCHAR | API Key（加密存储） |
| secretKey | VARCHAR | Secret Key（加密存储） |
| passphrase | VARCHAR | Passphrase（加密存储，OKX/Bitget 需要） |
| createdAt | DATETIME | 创建时间 |

### signal_sources — 信号源表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 信号源 ID |
| name | VARCHAR | 信号源名称 |
| symbol | VARCHAR | 交易对（如 ETH-USDT-SWAP） |
| apiKey | VARCHAR | OKX API Key（加密存储） |
| secretKey | VARCHAR | OKX Secret Key（加密存储） |
| passphrase | VARCHAR | OKX Passphrase（加密存储） |
| referencePosition | DECIMAL | 参考仓位（ETH） |
| expectedMonthlyReturn | DECIMAL | 预期月化收益（%） |
| isActive | BOOLEAN | 是否启用 |
| createdAt | DATETIME | 创建时间 |

### user_strategies — 用户策略表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 策略 ID |
| userId | INT | 用户 ID |
| signalSourceId | INT | 信号源 ID |
| exchangeApiId | INT | 使用的交易所 API ID |
| multiplier | DECIMAL | 跟单倍数 |
| isEnabled | BOOLEAN | 是否启用 |
| createdAt | DATETIME | 创建时间 |

### copy_orders — 跟单订单表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 订单 ID |
| userId | INT | 用户 ID |
| signalLogId | INT | 关联信号日志 ID |
| exchange | VARCHAR | 交易所 |
| symbol | VARCHAR | 交易对 |
| action | VARCHAR | 方向（open_long/open_short/close_long/close_short） |
| quantity | DECIMAL | 数量（ETH） |
| leverage | INT | 杠杆倍数 |
| multiplier | DECIMAL | 跟单倍数 |
| openPrice | DECIMAL | 开仓价 |
| closePrice | DECIMAL | 平仓价 |
| openTime | DATETIME | 开仓时间 |
| closeTime | DATETIME | 平仓时间 |
| fee | DECIMAL | 手续费（USDT） |
| realizedPnl | DECIMAL | 已实现盈亏（USDT） |
| netPnl | DECIMAL | 净盈亏（realizedPnl - fee） |
| revenueShareDeducted | DECIMAL | 被扣除的服务费（USDT） |
| status | VARCHAR | 状态（open/closed/failed） |
| exchangeOrderId | VARCHAR | 交易所订单 ID |
| errorMessage | TEXT | 失败原因 |
| isAbnormal | BOOLEAN | 是否被标记为异常 |
| fillPrice | DECIMAL | 实际成交均价 |
| createdAt | DATETIME | 创建时间 |

### signal_logs — 信号日志表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 日志 ID |
| signalSourceId | INT | 信号源 ID |
| action | VARCHAR | 信号方向 |
| symbol | VARCHAR | 交易对 |
| quantity | DECIMAL | 信号数量（ETH） |
| price | DECIMAL | 信号价格 |
| status | VARCHAR | 处理状态 |
| createdAt | DATETIME | 信号时间 |

### deposits — 充值记录表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 充值 ID |
| userId | INT | 用户 ID |
| amount | DECIMAL | 充值金额（USDT） |
| chain | VARCHAR | 链（BSC） |
| txHash | VARCHAR | 交易哈希 |
| status | VARCHAR | 状态（pending/confirmed/rejected） |
| createdAt | DATETIME | 创建时间 |

### withdrawals — 提现记录表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 提现 ID |
| userId | INT | 用户 ID |
| amount | DECIMAL | 申请金额（USDT） |
| fee | DECIMAL | 手续费 |
| netAmount | DECIMAL | 实际到账金额 |
| address | VARCHAR | 提现地址 |
| txHash | VARCHAR | 打款交易哈希 |
| status | VARCHAR | 状态（pending/completed/rejected） |
| createdAt | DATETIME | 创建时间 |

### revenue_share_records — 收益分成记录表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 记录 ID |
| copyOrderId | INT | 关联的平仓订单 ID |
| traderId | INT | 交易者用户 ID |
| recipientId | INT | 分成接收人用户 ID |
| amount | DECIMAL | 分成金额（USDT） |
| createdAt | DATETIME | 创建时间 |

### fund_transactions — 资金流水表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 流水 ID |
| userId | INT | 用户 ID |
| type | VARCHAR | 类型（deposit/withdrawal/revenue_share_out/revenue_share_in/adjustment/points_exchange） |
| amount | DECIMAL | 金额（正为收入，负为支出） |
| note | TEXT | 备注 |
| relatedUserId | INT | 关联用户 ID（分成场景） |
| createdAt | DATETIME | 创建时间 |

### deposit_addresses — 充值地址表

| 字段 | 类型 | 说明 |
|---|---|---|
| userId | INT PK | 用户 ID |
| address | VARCHAR | BSC 充值地址 |
| derivationIndex | INT | HD 钱包派生索引 |
| createdAt | DATETIME | 创建时间 |

### system_config — 系统配置表

| 字段 | 类型 | 说明 |
|---|---|---|
| key | VARCHAR PK | 配置键 |
| value | TEXT | 配置值 |

**常用配置键：**
- `main_wallet_address`：主钱包地址
- `main_wallet_mnemonic_encrypted`：加密的 HD 钱包助记词
- `deposit_addr_{userId}`：各用户的充值地址信息
- `min_withdrawal_amount`：最低提现金额

---

## 7. 多交易所仓位换算规则

信号源为 OKX，各交易所的合约规格不同，引擎统一以 **ETH 数量**为中间单位进行换算：

| 交易所 | 合约规格 | 下单单位 | 换算方式 |
|---|---|---|---|
| **OKX** | 1张 = 0.1 ETH | 张数 | 张数 × 0.1 = ETH |
| **Binance** | 直接按 ETH 数量 | ETH | 直接使用 |
| **Bybit** | 直接按 ETH 数量 | ETH | 直接使用 |
| **Bitget** | 1张 = 0.01 ETH | 张数 | 张数 × 0.01 = ETH |
| **Gate.io** | 动态（从合约信息获取） | 张数 | 张数 × quanto_multiplier = ETH |

**计算公式：**
```
实际 ETH 数量 = 信号张数 × OKX 合约面值(0.1) × 用户倍数
```

所有订单记录中的 `quantity` 字段均以 ETH 为单位存储，确保不同交易所用户的数据在管理后台可直接对比。

---

## 8. 多级收益分成逻辑

系统采用**差额多级分成**模型，确保每一级推荐人只赚取差额部分，总分成不超过交易者被扣除的比例。

### 触发条件

- 只有产生**净利润**（已实现盈亏 - 手续费 > 0）的平仓订单才会触发分成
- 亏损订单不扣除分成

### 计算示例

假设推荐链为：**A（管理员，比例 10%）→ B（推荐人，比例 10%）→ C（交易者，比例 30%）**

C 的一笔平仓单产生 100 USDT 净利润：

1. **C 被扣除：** 100 × 30% = 30 USDT（从 C 的余额扣除）
2. **B 获得分成：** 100 × (30% - 10%) = 20 USDT（C 的比例减去 B 自己的比例）
3. **A 获得分成：** 100 × (10% - 0%) = 10 USDT（B 的比例减去 A 自己的比例）
4. **平台留存：** 0 USDT（已全部分配）

### 规则约束

- 给下级设置的比例不能低于自己的比例，且最高不超过 70%
- 如果交易者没有推荐人，或差额计算后仍有剩余，剩余分成归平台（管理员账户）所有
- 分成实时结算，平仓后立即更新各级推荐人的余额

---

## 9. 充值与资金流转

### 充值流程

1. 用户在"充值提现"页面获取专属 BSC 地址（首次使用时从 HD 钱包派生）
2. 用户向该地址转入 USDT（BEP-20）
3. 系统通过 **BSCScan API + RPC 节点双重机制**自动扫描，检测到转账后自动入账
4. 或用户手动提交交易哈希，经管理员审核后入账

### 归集流程

- 管理员在后台点击"归集资金"，系统自动将各子地址的 USDT 转回主钱包
- 归集前需确保主钱包有足够 BNB 支付 Gas 费（建议保持 0.05 BNB 以上）
- 归集使用 HD 钱包派生私钥，无需手动管理各子地址私钥

### 提现流程

1. 用户填写提现地址（BSC 链）和金额
2. 系统扣除余额并创建提现申请（状态：pending）
3. 管理员在后台审核，批准后手动打款并填写交易哈希（状态：completed）
4. 或拒绝申请，余额退回用户账户（状态：rejected）

### 资金安全

- HD 钱包助记词使用 AES-256-GCM 加密存储在数据库 `system_config` 表中
- 主钱包私钥不存储在服务器，仅在归集操作时临时解密使用
- 建议定期将主钱包 USDT 转移到冷钱包

---

## 10. 生产环境部署指南

### 10.1 环境要求

- Node.js v20+
- PM2（`npm install -g pm2`）
- MariaDB / MySQL 8.0+
- Nginx
- 服务器：AWS Lightsail 新加坡节点（当前）

### 10.2 环境变量配置

创建 `ecosystem.config.cjs` 文件：

```javascript
module.exports = {
  apps: [{
    name: "copy-trading",
    script: "./dist/index.js",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 3001,
      DATABASE_URL: "mysql://copytrader:password@localhost:3306/copy_trading",
      JWT_SECRET: "your-secure-jwt-secret-min-32-chars",
      ENCRYPTION_KEY: "your-aes-256-encryption-key-32chars",
      BSC_MASTER_MNEMONIC: "your-hd-wallet-12-word-mnemonic",
      BSC_MAIN_WALLET: "0xYourMainWalletAddress",
      BSCSCAN_API_KEY: "your-bscscan-api-key",
    }
  }]
}
```

**重要：** `ecosystem.config.cjs` 已加入 `.gitignore`，不会提交到 GitHub，请妥善保管。

### 10.3 构建与启动

```bash
# 1. 克隆仓库
git clone https://github.com/WrbMax/copy-trading-platform.git
cd copy-trading-platform

# 2. 安装依赖
npm install --legacy-peer-deps

# 3. 执行数据库迁移
npx drizzle-kit push

# 4. 构建前端和后端
npm run build

# 5. 启动服务（使用 PM2）
pm2 start ecosystem.config.cjs

# 6. 查看运行状态
pm2 status
pm2 logs copy-trading
```

### 10.4 更新部署

```bash
# 在本地构建后，将 dist/ 目录上传到服务器
scp -r dist/ user@server:/www/wwwroot/copy-trading/

# 在服务器上重启
pm2 restart copy-trading
```

### 10.5 Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name winningwin.pro www.winningwin.pro;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name winningwin.pro www.winningwin.pro;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
```

---

## 11. 常见问题与排查

### 11.1 信号源 WS 登录失败（4001 Login failed）

**原因：** OKX 信号源的 API Key 未将服务器 IP 加入白名单。

**解决：** 登录 OKX，在 API Key 管理中将服务器的 IPv4 和 IPv6 地址均加入白名单。

### 11.2 Bybit 下单失败（position idx not match）

**原因：** 用户 Bybit 账户未开启双向持仓（对冲）模式。

**解决：** 通知用户在 Bybit 合约设置中开启"双向持仓"模式，然后重新开启策略。

### 11.3 OKX 下单失败（API key doesn't exist）

**原因：** 用户的 OKX API Key 已被删除或过期。

**解决：** 通知用户重新在 OKX 创建 API Key，并在平台"API 绑定"页面重新绑定。

### 11.4 Binance 下单失败（ReduceOnly Order is rejected）

**原因：** 平仓信号到达时，用户在该交易所的仓位已经为零（可能已手动平仓，或之前的平仓信号已成功执行）。

**处理：** 这是正常的保护机制，不影响资金，可忽略。

### 11.5 Bybit PnL 为 0

**原因：** Bybit 平仓后 PnL 数据有延迟，立即查询可能返回 0。

**解决：** 系统已内置重试机制（最多 5 次，每次间隔 2 秒），通常可自动修复。

### 11.6 充值未自动到账

**排查步骤：**
1. 检查交易是否已在 BSCScan 上确认（通常需要 15 个区块）
2. 检查后端日志中 BSCScan 扫描是否有报错
3. 确认充值地址是否正确（必须是平台分配的专属地址）
4. 如仍未到账，用户可手动提交交易哈希，管理员审核入账

### 11.7 归集失败（insufficient BNB）

**原因：** 主钱包 BNB 余额不足，无法支付 Gas 费。

**解决：** 向主钱包地址充入 BNB（建议保持 0.05 BNB 以上）。

### 11.8 服务器 502 Bad Gateway

**排查步骤：**
1. `pm2 status` 检查 copy-trading 进程是否在运行
2. `pm2 logs copy-trading --lines 50` 查看最新错误日志
3. 如进程崩溃，检查是否有新代码引入了数据库字段不存在的错误
4. `pm2 restart copy-trading` 重启服务

---

## 12. 变更记录

| 日期 | 版本 | 变更内容 |
|---|---|---|
| 2026-04-17 | v1.5 | 修复后台用户交易订单弹窗中开仓订单错误显示收益数据的问题；编写完整产品说明文档 |
| 2026-04-13 | v1.4.1 | 回滚订阅套餐系统（该功能已移除），恢复平台正常运行 |
| 2026-04-12 | v1.4 | 统一所有交易所订单数量单位为 ETH，修复跨交易所数量显示不一致问题 |
| 2026-04-11 | v1.3 | 修复 Bybit 签名算法错误（签名字符串应使用 apiKey 而非 secretKey） |
| 2026-04-10 | v1.2 | 修复币安 PnL 计算，改为直接使用交易所 API 返回的 realizedPnl；Bybit PnL 加入重试机制 |
| 2026-03-27 | v1.1 | 完善多交易所支持（Bybit、Bitget、Gate.io），优化仓位计算逻辑 |
| 2026-03-23 | v1.0 | 初始版本发布，支持 OKX 信号源 + Binance/OKX 跟单 |
