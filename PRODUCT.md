# AlphaRoute 产品技术文档

**版本：** v2.0（订阅制重构版）  
**更新时间：** 2026-04-08  
**作者：** Manus AI

---

## 目录

1. [产品概述](#1-产品概述)
2. [商业模式](#2-商业模式)
3. [功能模块详解](#3-功能模块详解)
4. [技术架构](#4-技术架构)
5. [数据库设计](#5-数据库设计)
6. [API 接口文档](#6-api-接口文档)
7. [跟单引擎原理](#7-跟单引擎原理)
8. [订阅支付系统](#8-订阅支付系统)
9. [安全机制](#9-安全机制)
10. [部署与运维](#10-部署与运维)
11. [环境变量配置](#11-环境变量配置)

---

## 1. 产品概述

AlphaRoute 是一款面向加密货币衍生品市场的**全自动量化跟单平台**。平台的核心价值在于：将专业交易员（信号源）的合约交易策略，实时、精准地复制到普通用户在各大主流交易所的独立账户中，让用户无需具备专业交易知识即可享受量化策略带来的收益。

### 1.1 核心特性

| 特性 | 描述 |
| :--- | :--- |
| **跨交易所跟单** | 信号源可在任意交易所交易，用户可在 Binance、OKX、Bybit、Bitget、Gate.io 等主流交易所自动执行 |
| **毫秒级响应** | 基于 WebSocket 实时监听信号，收到信号后并发执行所有用户的跟单指令 |
| **资金安全** | 平台不托管用户资金，用户资产始终在自己的交易所账户中，平台仅通过 API 密钥获取交易权限 |
| **订阅制收费** | 用户支付固定订阅费用，交易利润 100% 归用户所有，无任何隐性扣费 |
| **去中心化支付** | 支持 USDT (TRC20 / BSC) 链上支付，自动扫链确认，无需人工审核 |
| **邀请奖励机制** | 邀请好友订阅可获得奖励天数，被邀请人续费可持续获益 |

### 1.2 支持的交易所

| 交易所 | 合约类型 | 跟单支持 | 信号源支持 |
| :--- | :--- | :--- | :--- |
| Binance | USDT 永续合约 | ✅ | ✅ |
| OKX | USDT 永续合约 | ✅ | ✅（主要信号源） |
| Bybit | USDT 永续合约 | ✅ | ✅ |
| Bitget | USDT 永续合约 | ✅ | ✅ |
| Gate.io | USDT 永续合约 | ✅ | ✅ |

---

## 2. 商业模式

### 2.1 订阅制

平台采用**纯订阅制**，彻底摒弃利润分成模式。用户按时间周期付费，订阅期内享受无限制的跟单服务。

#### 订阅档位

| 档位 | 适用场景 | 可跟单策略 |
| :--- | :--- | :--- |
| **基础档 (Basic)** | 小额账户（< 阈值金额） | 基础档策略 |
| **进阶档 (Advanced)** | 大额账户（≥ 阈值金额） | 基础档 + 进阶档策略 |

> 阈值金额由管理员在后台配置（`advanced_threshold` 系统配置项），默认 10,000 USDT。

#### 订阅周期与价格

| 套餐代码 | 周期 | 天数 | 默认价格（USDT） |
| :--- | :--- | :--- | :--- |
| `basic_1m` | 基础档 1 个月 | 30 天 | 29 |
| `basic_6m` | 基础档 6 个月 | 180 天 | 149 |
| `basic_1y` | 基础档 1 年 | 365 天 | 249 |
| `advanced_1m` | 进阶档 1 个月 | 30 天 | 99 |
| `advanced_6m` | 进阶档 6 个月 | 180 天 | 499 |
| `advanced_1y` | 进阶档 1 年 | 365 天 | 899 |

> 所有价格均可由管理员在后台实时调整，调整后立即生效。

### 2.2 免费试用

所有新注册用户可一次性领取 **7 天免费试用**，体验基础档全部功能，无需支付任何费用。每个账户仅可领取一次。

### 2.3 邀请奖励机制

| 触发条件 | 奖励规则 |
| :--- | :--- |
| 被邀请人首次订阅 | 邀请人获得被邀请人订阅天数的 **20%** 作为奖励天数 |
| 被邀请人续费 | 邀请人持续获得每次续费天数的 **20%** 作为奖励天数 |
| 奖励档次 | 奖励天数累加到邀请人的**基础档**到期时间 |

> 奖励比例（`INVITE_BONUS_RATIO`）在代码中定义为 `0.2`，可通过修改 `server/db-subscription.ts` 中的常量调整。

---

## 3. 功能模块详解

### 3.1 用户端

#### 仪表盘 (Dashboard)
- 展示用户的**累计盈利**、**累计亏损**、**净盈亏**（累计盈利 - 累计亏损）
- 展示**跟单总数**和**当前持仓数量**
- 数据来源：`copy_orders` 表中该用户所有平仓单的 `netPnl` 字段汇总

#### 策略中心 (Strategies)
- 展示管理员配置的所有活跃信号源（按档位区分）
- 用户可为每个策略选择绑定的交易所 API 和跟单倍数
- 用户可一键启用/停用某个策略的跟单
- 订阅状态不满足时，相应档位的策略不可启用

#### 订单记录 (Orders)
- 展示该用户所有的跟单记录（开仓单和平仓单）
- **开仓单**（`open_long` / `open_short`）：显示开仓价、数量、方向，盈亏列显示 `-`
- **平仓单**（`close_long` / `close_short`）：显示平仓价、已实现盈亏（交易所直接返回）、手续费、净盈亏
- 支持按交易所、方向筛选，支持分页

#### 我的订阅 (Subscription)
- 展示当前基础档和进阶档的订阅状态和到期时间
- 展示各套餐价格
- 支持选择套餐、支付网络（BSC / TRC20），生成专属收款地址和二维码
- 订单有效期 2 小时，超时自动作废
- 用户可提交交易哈希进行手动确认（补充机制）

#### 邀请奖励 (Invite Reward)
- 展示专属邀请链接和邀请码
- 展示已邀请的团队成员列表（姓名、订阅状态、加入时间）
- 展示团队累计消费金额
- 展示自己通过邀请累计获得的奖励天数

#### API 绑定 (API Keys)
- 支持绑定 Binance、OKX、Bybit、Bitget、Gate.io 的 API 密钥
- 绑定时自动进行连通性测试，验证 API 权限是否正常
- API 密钥采用 AES-256-GCM 加密存储
- 支持多个交易所 API 并存，每个策略独立选择使用哪个 API

### 3.2 管理端

#### 数据大盘 (Admin Dashboard)
- 展示平台总注册用户数
- 展示所有用户的累计盈利总额和累计亏损总额
- 展示异常订单数量（需要人工处理的订单）
- 展示平台订阅收入统计（总收入、基础档收入、进阶档收入）

#### 订阅管理 (Admin Subscription)

**钱包配置 Tab：**
- 初始化 HD 钱包（输入或生成助记词，加密存储）
- 导出当前助记词（用于备份）
- 配置 BSC 归集主地址（用户支付后自动归集到此地址）
- 配置 TRC20 归集主地址（用户支付后自动归集到此地址）

**价格配置 Tab：**
- 实时调整 6 个套餐的 USDT 价格
- 配置进阶档阈值金额

**订单审核 Tab：**
- 查看所有用户的订阅支付订单（待支付、已支付、已过期）
- 手动触发扫链（补充机制）
- 手动批准或拒绝异常订单
- 管理员直接赠送订阅天数给指定用户

#### 用户管理 (Admin Users)
- 查看所有注册用户列表（ID、邮箱、注册时间、订阅状态、订阅到期时间）
- 查看用户的跟单记录（总订单数、持仓中、累计盈利、平台扣费）
- 查看用户的订阅消费历史
- 查看用户的邀请关系（邀请人、被邀请人列表）
- 一键启用/停用用户账户

#### 信号源管理 (Admin Signal Sources)
- 创建和管理信号源（名称、交易对、参考仓位、预期月化收益范围）
- 配置信号源的交易所 API 密钥（用于 WebSocket 监听）
- 设置信号源所属档位（基础档 / 进阶档）
- 查看信号源的历史信号日志

#### 订单监控 (Admin Orders)
- 全局查看所有用户的跟单订单
- 筛选异常订单，查看错误信息
- 手动标记订单为异常或正常
- 查看订单的完整执行详情

---

## 4. 技术架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│  React + Vite + TailwindCSS + shadcn/ui + tRPC Client       │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/tRPC
┌─────────────────────────▼───────────────────────────────────┐
│                    Server (Node.js)                          │
│  Express + tRPC Router                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Auth Router │  │ Strategy     │  │ Subscription     │  │
│  │  User Router │  │ Router       │  │ Router           │  │
│  │  Exchange    │  │              │  │                  │  │
│  │  Router      │  │              │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Copy Trading Engine                      │   │
│  │  WebSocket Listener → Signal Processor → Order       │   │
│  │  Executor (Concurrent, per-user)                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Subscription Payment Scanner               │   │
│  │  BSC Scanner (BscScan API) + TRC20 Scanner           │   │
│  │  (TronGrid API) → Auto-confirm → Activate Sub        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │ Drizzle ORM
┌─────────────────────────▼───────────────────────────────────┐
│                    MySQL Database                            │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 技术栈

| 层次 | 技术 | 版本 | 说明 |
| :--- | :--- | :--- | :--- |
| 前端框架 | React | 18.x | 核心 UI 框架 |
| 前端构建 | Vite | 6.x | 开发服务器和构建工具 |
| 前端样式 | TailwindCSS | 3.x | 原子化 CSS |
| UI 组件库 | shadcn/ui | latest | 基于 Radix UI 的组件库 |
| 前后端通信 | tRPC | 11.x | 端到端类型安全的 RPC 框架 |
| 后端运行时 | Node.js | 22.x | 服务器运行环境 |
| 后端框架 | Express | 4.x | HTTP 服务器 |
| ORM | Drizzle ORM | 0.40.x | 类型安全的数据库操作 |
| 数据库 | MySQL | 8.x | 关系型数据库 |
| 进程管理 | PM2 | latest | 生产环境进程守护 |
| 区块链 | ethers.js | 6.x | BSC HD 钱包和链上交互 |
| 路由 | wouter | 3.x | 轻量级前端路由 |

### 4.3 项目目录结构

```
/
├── client/                    # 前端代码
│   ├── src/
│   │   ├── App.tsx            # 路由配置
│   │   ├── _core/             # 核心 hooks（useAuth 等）
│   │   ├── components/        # 公共组件
│   │   │   ├── UserLayout.tsx # 用户端布局（导航栏）
│   │   │   ├── AdminLayout.tsx# 管理端布局（侧边栏）
│   │   │   └── ui/            # shadcn/ui 组件
│   │   └── pages/             # 页面组件
│   │       ├── LandingPage.tsx
│   │       ├── Login.tsx
│   │       ├── Register.tsx
│   │       ├── Dashboard.tsx
│   │       ├── Strategy.tsx
│   │       ├── Orders.tsx
│   │       ├── Subscription.tsx
│   │       ├── InviteReward.tsx
│   │       ├── ApiKeys.tsx
│   │       └── admin/
│   │           ├── AdminDashboard.tsx
│   │           ├── AdminSubscription.tsx
│   │           ├── AdminUsers.tsx
│   │           ├── AdminSignalSources.tsx
│   │           └── AdminOrders.tsx
├── server/                    # 后端代码
│   ├── _core/                 # 核心框架代码
│   │   ├── index.ts           # 服务器入口（启动所有服务）
│   │   ├── trpc.ts            # tRPC 配置（protectedProcedure 等）
│   │   └── context.ts         # 请求上下文（用户认证）
│   ├── routers/               # tRPC 路由
│   │   ├── auth.ts            # 认证相关 API
│   │   ├── user.ts            # 用户管理 API
│   │   ├── exchange.ts        # 交易所 API 管理
│   │   ├── strategy.ts        # 策略和跟单 API
│   │   └── subscription.ts    # 订阅管理 API
│   ├── copy-engine.ts         # 跟单引擎核心
│   ├── subscription-payment.ts# 订阅支付扫链服务
│   ├── db.ts                  # 数据库操作函数
│   ├── db-subscription.ts     # 订阅相关数据库操作
│   ├── crypto.ts              # AES-256-GCM 加密工具
│   ├── binance-client.ts      # Binance API 封装
│   ├── okx-client.ts          # OKX API 封装
│   ├── bybit-client.ts        # Bybit API 封装
│   ├── bitget-client.ts       # Bitget API 封装
│   ├── gate-client.ts         # Gate.io API 封装
│   ├── bsc-wallet.ts          # BSC 链上操作
│   ├── trc20-wallet.ts        # TRC20 链上操作
│   └── email.ts               # 邮件发送服务
├── drizzle/                   # 数据库 Schema 和迁移文件
│   ├── schema.ts              # 数据库表结构定义
│   └── *.sql                  # 迁移 SQL 文件
├── shared/                    # 前后端共享代码
│   ├── types.ts               # 共享类型定义
│   └── const.ts               # 共享常量
├── ecosystem.config.cjs       # PM2 配置
└── package.json
```

---

## 5. 数据库设计

### 5.1 核心业务表

#### `users` — 用户表

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | INT PK | 用户 ID |
| `openId` | VARCHAR(64) UNIQUE | 系统内部唯一标识 |
| `name` | TEXT | 用户昵称 |
| `email` | VARCHAR(320) UNIQUE | 邮箱（登录账号） |
| `passwordHash` | VARCHAR(256) | 密码哈希（bcrypt） |
| `inviteCode` | VARCHAR(16) UNIQUE | 用户专属邀请码 |
| `referrerId` | INT | 邀请人用户 ID（外键 → users.id） |
| `isActive` | BOOLEAN | 账户是否启用 |
| `basicExpiry` | TIMESTAMP | 基础档订阅到期时间（null = 未订阅） |
| `advancedExpiry` | TIMESTAMP | 进阶档订阅到期时间（null = 未订阅） |
| `trialUsed` | BOOLEAN | 是否已领取 7 天试用 |
| `totalProfit` | DECIMAL(20,8) | 累计盈利（冗余字段，实时更新） |
| `totalLoss` | DECIMAL(20,8) | 累计亏损（冗余字段，实时更新） |
| `createdAt` | TIMESTAMP | 注册时间 |

#### `exchange_apis` — 交易所 API 表

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | INT PK | API 记录 ID |
| `userId` | INT | 所属用户 ID |
| `exchange` | VARCHAR(20) | 交易所名称（binance/okx/bybit/bitget/gate） |
| `label` | VARCHAR(64) | 用户自定义标签 |
| `apiKeyEncrypted` | TEXT | 加密存储的 API Key |
| `secretKeyEncrypted` | TEXT | 加密存储的 Secret Key |
| `passphraseEncrypted` | TEXT | 加密存储的 Passphrase（OKX/Bitget 需要） |
| `isActive` | BOOLEAN | 是否启用 |
| `isVerified` | BOOLEAN | 是否通过连通性测试 |
| `lastTestedAt` | TIMESTAMP | 最后测试时间 |
| `testMessage` | TEXT | 最后测试结果信息 |

#### `signal_sources` — 信号源表

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | INT PK | 信号源 ID |
| `name` | VARCHAR(128) | 信号源名称 |
| `symbol` | VARCHAR(20) | 交易对符号（如 ETH） |
| `tradingPair` | VARCHAR(32) | 完整交易对（如 ETH-USDT-SWAP） |
| `referencePosition` | DECIMAL(20,8) | 参考仓位大小（USDT） |
| `expectedMonthlyReturnMin` | DECIMAL(5,2) | 预期月化最低收益率（%） |
| `expectedMonthlyReturnMax` | DECIMAL(5,2) | 预期月化最高收益率（%） |
| `exchange` | VARCHAR(20) | 信号源所在交易所 |
| `apiKeyEncrypted` | TEXT | 信号源账户 API Key（加密） |
| `tier` | VARCHAR(16) | 档位（basic / advanced） |
| `isActive` | BOOLEAN | 是否启用 |

#### `user_strategies` — 用户策略订阅表

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | INT PK | 记录 ID |
| `userId` | INT | 用户 ID |
| `signalSourceId` | INT | 信号源 ID |
| `exchangeApiId` | INT | 使用的交易所 API ID |
| `multiplier` | DECIMAL(10,2) | 跟单倍数（默认 1.0） |
| `isEnabled` | BOOLEAN | 是否启用跟单 |

#### `copy_orders` — 跟单订单表

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | INT PK | 订单 ID |
| `userId` | INT | 用户 ID |
| `signalLogId` | INT | 触发此订单的信号日志 ID |
| `signalSourceId` | INT | 信号源 ID |
| `exchangeApiId` | INT | 执行交易的 API ID |
| `exchange` | ENUM | 交易所（binance/okx/bybit/bitget/gate） |
| `symbol` | VARCHAR(20) | 交易对 |
| `action` | ENUM | 操作类型（open_long/open_short/close_long/close_short/close_all） |
| `multiplier` | DECIMAL(10,2) | 跟单倍数 |
| `signalQuantity` | DECIMAL(20,8) | 信号源的原始数量 |
| `actualQuantity` | DECIMAL(20,8) | 实际执行数量（= 信号量 × 倍数） |
| `openPrice` | DECIMAL(20,8) | 开仓成交价 |
| `closePrice` | DECIMAL(20,8) | 平仓成交价（平仓单填写） |
| `openTime` | TIMESTAMP | 开仓时间 |
| `closeTime` | TIMESTAMP | 平仓时间（平仓单填写） |
| `exchangeOrderId` | VARCHAR(128) | 交易所返回的订单 ID |
| `closeOrderId` | VARCHAR(128) | 平仓订单在交易所的 ID |
| `realizedPnl` | DECIMAL(20,8) | 已实现盈亏（**仅平仓单填写**，来自交易所直接返回） |
| `fee` | DECIMAL(20,8) | 手续费（**仅平仓单填写**） |
| `netPnl` | DECIMAL(20,8) | 净盈亏 = realizedPnl - fee（**仅平仓单填写**） |
| `revenueShareDeducted` | DECIMAL(20,8) | 平台服务费扣除金额 |
| `status` | ENUM | 状态（pending/open/closed/failed/cancelled） |
| `isAbnormal` | BOOLEAN | 是否标记为异常订单 |

> **重要设计说明：** `realizedPnl`、`fee`、`netPnl` 三个字段**仅在平仓单（`close_long`/`close_short`）中填写**，数据直接来自交易所 API 返回值。开仓单这三个字段始终为 `null`，前端展示时对开仓单的盈亏列显示 `-`。

#### `subscriptions` — 订阅记录表

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | INT PK | 记录 ID |
| `userId` | INT | 用户 ID |
| `type` | ENUM | 订阅类型（trial/basic_1m/basic_6m/basic_1y/advanced_1m/advanced_6m/advanced_1y/invite_bonus/admin_grant） |
| `daysAdded` | INT | 本次增加的天数 |
| `amountPaid` | DECIMAL(20,8) | 支付金额（试用/邀请奖励为 0） |
| `txHash` | VARCHAR(128) | 链上交易哈希 |
| `payAddress` | VARCHAR(128) | 收款地址 |
| `relatedUserId` | INT | 关联用户 ID（邀请奖励时为被邀请人 ID） |
| `expiryBefore` | TIMESTAMP | 订阅前的到期时间 |
| `expiryAfter` | TIMESTAMP | 订阅后的到期时间 |
| `tier` | ENUM | 档位（basic / advanced） |
| `status` | ENUM | 审核状态（pending/approved/rejected） |

#### `subscription_orders` — 订阅支付订单表

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | INT PK | 订单 ID |
| `userId` | INT | 用户 ID |
| `plan` | VARCHAR(32) | 套餐代码（如 basic_1m） |
| `tier` | ENUM | 档位（basic / advanced） |
| `amount` | DECIMAL(20,8) | 应付金额（USDT） |
| `chain` | ENUM | 支付链（BSC / TRC20） |
| `payAddress` | VARCHAR(128) | 专属收款地址（HD 钱包派生） |
| `derivationIndex` | INT | HD 派生索引（用于扫链时获取私钥） |
| `status` | ENUM | 订单状态（pending/paid/expired/cancelled） |
| `txHash` | VARCHAR(128) | 检测到的支付交易哈希 |
| `paidAmount` | DECIMAL(20,8) | 实际收到的金额 |
| `expiresAt` | TIMESTAMP | 订单过期时间（创建后 2 小时） |
| `paidAt` | TIMESTAMP | 支付完成时间 |
| `subscriptionId` | INT | 关联的订阅记录 ID（支付成功后填写） |

#### `system_config` — 系统配置表

| Key | 说明 |
| :--- | :--- |
| `hd_mnemonic_encrypted` | HD 钱包助记词（AES-256-GCM 加密存储） |
| `bsc_collect_address` | BSC 归集主地址 |
| `trc20_collect_address` | TRC20 归集主地址 |
| `sub_price_basic_1m` | 基础档 1 个月价格（USDT） |
| `sub_price_basic_6m` | 基础档 6 个月价格（USDT） |
| `sub_price_basic_1y` | 基础档 1 年价格（USDT） |
| `sub_price_advanced_1m` | 进阶档 1 个月价格（USDT） |
| `sub_price_advanced_6m` | 进阶档 6 个月价格（USDT） |
| `sub_price_advanced_1y` | 进阶档 1 年价格（USDT） |
| `advanced_threshold` | 进阶档资金阈值（USDT，默认 10000） |

---

## 6. API 接口文档

所有接口均通过 **tRPC** 框架提供，前端通过类型安全的方式调用。接口分为三类权限：
- `publicProcedure`：无需登录
- `protectedProcedure`：需要用户登录
- `adminProcedure`：需要管理员权限

### 6.1 认证模块（`auth.*`）

| 接口 | 类型 | 权限 | 说明 |
| :--- | :--- | :--- | :--- |
| `auth.me` | Query | Public | 获取当前登录用户信息 |
| `auth.logout` | Mutation | Public | 退出登录 |
| `auth.sendCode` | Mutation | Public | 发送邮箱验证码 |
| `auth.register` | Mutation | Public | 注册新账户（需邀请码） |
| `auth.login` | Mutation | Public | 邮箱密码登录 |
| `auth.resetPassword` | Mutation | Public | 重置密码 |

### 6.2 用户模块（`user.*`）

| 接口 | 类型 | 权限 | 说明 |
| :--- | :--- | :--- | :--- |
| `user.profile` | Query | Protected | 获取个人资料 |
| `user.updateProfile` | Mutation | Protected | 更新个人资料 |
| `user.adminList` | Query | Admin | 获取用户列表 |
| `user.adminGetInvitees` | Query | Admin | 获取指定用户的邀请列表 |
| `user.adminToggleActive` | Mutation | Admin | 启用/停用用户账户 |

### 6.3 交易所 API 模块（`exchange.*`）

| 接口 | 类型 | 权限 | 说明 |
| :--- | :--- | :--- | :--- |
| `exchange.list` | Query | Protected | 获取已绑定的 API 列表 |
| `exchange.bind` | Mutation | Protected | 绑定新的交易所 API |
| `exchange.update` | Mutation | Protected | 更新 API 信息 |
| `exchange.delete` | Mutation | Protected | 删除 API |
| `exchange.test` | Mutation | Protected | 测试 API 连通性 |
| `exchange.toggle` | Mutation | Protected | 启用/停用 API |

### 6.4 策略模块（`strategy.*`）

| 接口 | 类型 | 权限 | 说明 |
| :--- | :--- | :--- | :--- |
| `strategy.list` | Query | Public | 获取所有活跃信号源列表 |
| `strategy.listForUser` | Query | Protected | 获取用户可用的信号源列表（含订阅状态） |
| `strategy.myStrategies` | Query | Protected | 获取用户已配置的策略列表 |
| `strategy.setStrategy` | Mutation | Protected | 设置/更新策略配置（倍数、API、启用状态） |
| `strategy.orders` | Query | Protected | 获取用户跟单订单列表 |
| `strategy.orderStats` | Query | Protected | 获取用户跟单统计数据 |
| `strategy.adminListSources` | Query | Admin | 获取所有信号源（含未启用的） |
| `strategy.adminCreateSource` | Mutation | Admin | 创建新信号源 |
| `strategy.adminUpdateSource` | Mutation | Admin | 更新信号源 |
| `strategy.adminSignalLogs` | Query | Admin | 查看信号日志 |
| `strategy.adminAllOrders` | Query | Admin | 查看所有用户的跟单订单 |
| `strategy.adminMarkAbnormal` | Mutation | Admin | 标记/取消标记异常订单 |
| `strategy.adminEngineStatus` | Query | Admin | 获取跟单引擎状态 |
| `strategy.adminReloadEngine` | Mutation | Admin | 重载跟单引擎 |
| `strategy.receiveSignal` | Mutation | Public | 接收 Webhook 信号（需 webhookSecret 验证） |
| `strategy.simulateClose` | Mutation | Admin | 模拟平仓（测试用） |

### 6.5 订阅模块（`subscription.*`）

| 接口 | 类型 | 权限 | 说明 |
| :--- | :--- | :--- | :--- |
| `subscription.myStatus` | Query | Protected | 获取当前订阅状态（档位、到期时间、可用功能） |
| `subscription.switchTier` | Mutation | Protected | 切换活跃档位（basic / advanced） |
| `subscription.claimTrial` | Mutation | Protected | 领取 7 天免费试用 |
| `subscription.createOrder` | Mutation | Protected | 创建订阅支付订单（返回专属收款地址） |
| `subscription.myPendingOrder` | Query | Protected | 获取当前待支付订单 |
| `subscription.orderStatus` | Query | Protected | 查询指定订单的支付状态 |
| `subscription.submitTxHash` | Mutation | Protected | 提交交易哈希（手动确认支付） |
| `subscription.myOrders` | Query | Protected | 获取历史支付订单列表 |
| `subscription.myHistory` | Query | Protected | 获取订阅历史记录 |
| `subscription.teamStats` | Query | Protected | 获取邀请团队统计（成员数、总消费） |
| `subscription.inviteeList` | Query | Protected | 获取邀请成员列表 |
| `subscription.adminStats` | Query | Admin | 获取订阅收入统计 |
| `subscription.adminList` | Query | Admin | 获取所有订阅记录 |
| `subscription.adminOrderList` | Query | Admin | 获取所有支付订单 |
| `subscription.adminScanOrders` | Mutation | Admin | 手动触发扫链 |
| `subscription.adminApprove` | Mutation | Admin | 手动批准订阅订单 |
| `subscription.adminReject` | Mutation | Admin | 拒绝订阅订单 |
| `subscription.adminGrant` | Mutation | Admin | 管理员直接赠送订阅天数 |
| `subscription.adminGetPrices` | Query | Admin | 获取当前价格配置 |
| `subscription.adminSetCollectAddresses` | Mutation | Admin | 设置 BSC/TRC20 归集主地址 |
| `subscription.adminSetPrices` | Mutation | Admin | 更新套餐价格 |
| `subscription.adminInitWallet` | Mutation | Admin | 初始化 HD 钱包（输入或生成助记词） |
| `subscription.adminGetUserOrders` | Query | Admin | 获取指定用户的支付订单 |
| `subscription.adminGetUserSubscriptions` | Query | Admin | 获取指定用户的订阅历史 |
| `subscription.adminExportMnemonic` | Query | Admin | 导出当前 HD 钱包助记词 |

---

## 7. 跟单引擎原理

### 7.1 整体流程

```
信号源账户（交易所）
        │
        │ WebSocket 持仓变化推送
        ▼
Copy Engine（server/copy-engine.ts）
        │
        ├─ 解析信号（开多/开空/平多/平空/全平）
        │
        ├─ 查询所有订阅该信号源的活跃用户策略
        │
        ├─ 并发执行（Promise.allSettled）
        │   ├─ 用户 A：计算数量 → 调用交易所 API → 记录订单
        │   ├─ 用户 B：计算数量 → 调用交易所 API → 记录订单
        │   └─ 用户 C：...
        │
        └─ 记录信号日志（成功/失败统计）
```

### 7.2 信号接收方式

跟单引擎支持两种信号接收方式：

**方式一：WebSocket 实时监听（主要方式）**

通过 OKX WebSocket 私有频道 `positions` 实时监听信号源账户的持仓变化。当持仓发生变化时，引擎自动计算变化方向（开仓/平仓）并触发跟单。

**方式二：Webhook 推送**

通过 `strategy.receiveSignal` 接口接收外部系统推送的信号。需要在信号源配置中设置 `webhookSecret` 进行鉴权。

### 7.3 数量计算规则

跟单数量的计算公式：

```
实际跟单数量 = 信号源变化数量 × 用户倍数 × (用户账户余额 / 信号源参考仓位)
```

其中：
- **信号源变化数量**：信号源账户本次开仓/平仓的合约数量
- **用户倍数**：用户在策略配置中设置的 `multiplier`（默认 1.0）
- **参考仓位**：管理员在信号源配置中设置的参考资金量

### 7.4 订阅状态检查

在执行跟单前，引擎会检查：
1. 用户账户是否处于激活状态（`isActive = true`）
2. 用户是否有有效的订阅（基础档或进阶档到期时间 > 当前时间）
3. 用户订阅的档位是否与信号源档位匹配（进阶档用户可跟基础档和进阶档策略）

### 7.5 平仓盈亏记录

平仓时，引擎通过交易所 API 查询平仓订单的详细信息，并将以下数据写入平仓单：
- `realizedPnl`：交易所直接返回的已实现盈亏
- `fee`：手续费
- `netPnl`：净盈亏 = realizedPnl - fee
- `closePrice`：平仓成交价
- `closeTime`：平仓时间

> **注意：** 开仓单的 `realizedPnl`、`fee`、`netPnl` 字段始终为 `null`。前端展示时，开仓单的盈亏列显示 `-`，只有平仓单才显示实际盈亏数据。

---

## 8. 订阅支付系统

### 8.1 HD 钱包地址派生

平台使用 **BIP-44 HD 钱包**为每个订阅订单派生独立的收款地址，确保每笔支付可被精确追踪。

**BSC 地址派生路径：**
```
m/44'/60'/0'/0/{index + 1,000,000}
```

**TRC20 地址派生路径：**
```
m/44'/195'/0'/0/{index + 1,000,000}
```

> 使用 1,000,000 偏移量是为了避免与其他用途的地址产生冲突。

### 8.2 支付流程

```
用户选择套餐和支付链
        │
        ▼
系统创建 subscription_orders 记录
派生唯一收款地址（HD 钱包 index）
返回收款地址和二维码给用户
        │
        ▼
用户转账 USDT 到收款地址
        │
        ▼
扫链服务（每 30 秒）
├─ BSC：调用 BscScan API 查询 USDT Transfer 事件
└─ TRC20：调用 TronGrid API 查询 TRC20 转账记录
        │
        ▼
检测到支付（金额 ≥ 应付金额的 99%）
        │
        ▼
更新订单状态为 paid
创建 subscriptions 记录（增加到期时间）
更新 users 表的 basicExpiry / advancedExpiry
触发邀请奖励（若有邀请人）
自动归集资金到主地址
```

### 8.3 自动归集

支付确认后，系统自动将收款地址中的 USDT 归集到管理员配置的主地址：
- **BSC**：通过 ethers.js 构造并广播 ERC-20 Transfer 交易
- **TRC20**：通过 TronGrid API 广播 TRC20 Transfer 交易

### 8.4 订单过期处理

订单创建后 **2 小时**内未支付，自动标记为 `expired` 状态。扫链服务在每次扫描时同时处理过期订单。

---

## 9. 安全机制

### 9.1 API 密钥加密

所有用户的交易所 API 密钥和信号源 API 密钥均使用 **AES-256-GCM** 算法加密存储。加密密钥通过环境变量 `ENCRYPTION_KEY` 配置，不存储在数据库中。

加密实现位于 `server/crypto.ts`：
```typescript
// 加密：AES-256-GCM，随机 IV，认证标签
encrypt(plaintext: string): string

// 解密：验证认证标签，防止篡改
decrypt(ciphertext: string): string
```

### 9.2 HD 钱包助记词加密

平台的 HD 钱包助记词同样使用 AES-256-GCM 加密后存储在 `system_config` 表中，不以明文形式存储在任何地方。

### 9.3 权限控制

- **用户认证**：基于 JWT Cookie，服务端验证 Session
- **管理员权限**：通过 `isAdmin` 字段控制，管理员账户在注册时或通过数据库直接设置
- **API 权限隔离**：用户只能访问自己的数据，管理员接口有独立的 `adminProcedure` 中间件保护

### 9.4 资金安全

- 平台**不托管**用户的交易资金，用户资产始终在自己的交易所账户中
- 平台 API 密钥**仅需要交易权限**，严禁开启提现权限
- 订阅支付地址是**一次性使用**的独立地址，支付后自动归集，不存在资金池风险

---

## 10. 部署与运维

### 10.1 环境要求

| 组件 | 版本要求 |
| :--- | :--- |
| Node.js | ≥ 22.x |
| MySQL | ≥ 8.0 |
| 操作系统 | Ubuntu 22.04 LTS（推荐） |
| 内存 | ≥ 2 GB |
| 磁盘 | ≥ 20 GB |

### 10.2 首次部署步骤

```bash
# 1. 克隆代码
git clone <repo-url> /www/wwwroot/copy-trading
cd /www/wwwroot/copy-trading

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp ecosystem.config.cjs ecosystem.config.local.cjs
# 编辑 ecosystem.config.local.cjs，填写真实的数据库连接、密钥等配置

# 4. 初始化数据库
pnpm db:push

# 5. 构建前端和后端
pnpm build

# 6. 启动服务
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 10.3 更新部署步骤

```bash
cd /www/wwwroot/copy-trading
git pull origin main
pnpm install
pnpm build
pm2 restart copy-trading
```

### 10.4 常用运维命令

```bash
# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs copy-trading

# 查看最近 200 行日志
pm2 logs copy-trading --lines 200

# 重启服务
pm2 restart copy-trading

# 停止服务
pm2 stop copy-trading

# 数据库迁移（Schema 变更后执行）
pnpm db:push
```

### 10.5 Nginx 反向代理配置（参考）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 11. 环境变量配置

所有环境变量在 `ecosystem.config.cjs` 中配置：

| 变量名 | 必填 | 说明 | 示例 |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | 是 | 运行环境 | `production` |
| `PORT` | 是 | 服务监听端口 | `3001` |
| `DATABASE_URL` | 是 | MySQL 连接字符串 | `mysql://user:pass@localhost:3306/db` |
| `JWT_SECRET` | 是 | JWT 签名密钥（随机 64 位十六进制） | `af423a19...` |
| `ENCRYPTION_KEY` | 是 | AES-256 加密密钥（随机 64 位十六进制） | `0a15a742...` |
| `BSCSCAN_API_KEY` | 是 | BscScan API Key（用于查询 BSC 链上交易） | `ABCDEF...` |
| `EMAIL_HOST` | 否 | SMTP 服务器地址 | `smtp.gmail.com` |
| `EMAIL_PORT` | 否 | SMTP 端口 | `587` |
| `EMAIL_USER` | 否 | SMTP 登录邮箱 | `noreply@example.com` |
| `EMAIL_PASS` | 否 | SMTP 登录密码或应用密码 | `xxxx xxxx xxxx xxxx` |
| `EMAIL_FROM` | 否 | 发件人邮箱地址 | `noreply@example.com` |

> **安全提示：** 生产环境中，`JWT_SECRET` 和 `ENCRYPTION_KEY` 必须使用强随机值，且不得泄露。可使用以下命令生成：
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 11.1 初始化管理员账户

首次部署后，需要通过数据库直接设置管理员账户：

```sql
-- 先注册一个普通账户，然后通过以下 SQL 设置为管理员
UPDATE users SET isAdmin = 1 WHERE email = 'admin@example.com';
```

### 11.2 初始化 HD 钱包

登录管理后台后，进入「订阅管理 → 钱包配置」：
1. 点击「生成新钱包」或「导入助记词」
2. **务必备份助记词**（点击「导出助记词」并安全保存）
3. 配置 BSC 和 TRC20 的归集主地址
4. 在「价格配置」中设置各套餐价格

---

*AlphaRoute - 让量化交易更简单、更透明、更安全。*
