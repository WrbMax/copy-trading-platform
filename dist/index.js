var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/crypto.ts
var crypto_exports = {};
__export(crypto_exports, {
  decrypt: () => decrypt,
  encrypt: () => encrypt,
  generateInviteCode: () => generateInviteCode,
  generateVerificationCode: () => generateVerificationCode,
  hashPassword: () => hashPassword,
  maskApiKey: () => maskApiKey,
  verifyPassword: () => verifyPassword
});
import crypto from "crypto";
function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || "default-secret-key-for-development";
  return crypto.scryptSync(secret, "copy-trading-salt", KEY_LENGTH);
}
function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}
function decrypt(ciphertext) {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivHex, tagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}
function maskApiKey(key) {
  if (key.length <= 8) return "****";
  return key.substring(0, 4) + "****" + key.substring(key.length - 4);
}
function generateInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}
function generateVerificationCode() {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const inputHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(inputHash, "hex"));
}
var ALGORITHM, KEY_LENGTH, IV_LENGTH;
var init_crypto = __esm({
  "server/crypto.ts"() {
    "use strict";
    ALGORITHM = "aes-256-gcm";
    KEY_LENGTH = 32;
    IV_LENGTH = 16;
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/systemRouter.ts
import { z } from "zod";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  }))
});

// server/routers/auth.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
import { z as z2 } from "zod";

// server/db.ts
import { and, desc, eq, gte, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import {
  bigint,
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar
} from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  passwordHash: varchar("passwordHash", { length: 256 }),
  inviteCode: varchar("inviteCode", { length: 16 }).unique(),
  referrerId: int("referrerId"),
  balance: decimal("balance", { precision: 20, scale: 8 }).default("0").notNull(),
  points: bigint("points", { mode: "number" }).default(0).notNull(),
  totalProfit: decimal("totalProfit", { precision: 20, scale: 8 }).default("0").notNull(),
  totalLoss: decimal("totalLoss", { precision: 20, scale: 8 }).default("0").notNull(),
  lastPointsRedeemMonth: varchar("lastPointsRedeemMonth", { length: 30 }),
  revenueShareRatio: decimal("revenueShareRatio", { precision: 5, scale: 2 }).default("0").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var emailVerificationCodes = mysqlTable("email_verification_codes", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 8 }).notNull(),
  type: mysqlEnum("type", ["register", "login", "reset_password"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var exchangeApis = mysqlTable("exchange_apis", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  exchange: mysqlEnum("exchange", ["binance", "okx", "bybit", "bitget", "gate"]).notNull(),
  label: varchar("label", { length: 64 }),
  apiKeyEncrypted: text("apiKeyEncrypted").notNull(),
  secretKeyEncrypted: text("secretKeyEncrypted").notNull(),
  passphraseEncrypted: text("passphraseEncrypted"),
  isActive: boolean("isActive").default(true).notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  testStatus: mysqlEnum("testStatus", ["success", "failed", "pending"]).default("pending"),
  testMessage: text("testMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var signalSources = mysqlTable("signal_sources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  tradingPair: varchar("tradingPair", { length: 32 }).notNull(),
  referencePosition: decimal("referencePosition", { precision: 20, scale: 8 }).notNull(),
  expectedMonthlyReturnMin: decimal("expectedMonthlyReturnMin", { precision: 5, scale: 2 }).notNull(),
  expectedMonthlyReturnMax: decimal("expectedMonthlyReturnMax", { precision: 5, scale: 2 }).notNull(),
  description: text("description"),
  apiKeyEncrypted: text("apiKeyEncrypted"),
  apiSecretEncrypted: text("apiSecretEncrypted"),
  webhookSecret: text("webhookSecret"),
  exchange: varchar("exchange", { length: 20 }).default("okx").notNull(),
  passphraseEncrypted: text("passphraseEncrypted"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var userStrategies = mysqlTable("user_strategies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  signalSourceId: int("signalSourceId").notNull(),
  exchangeApiId: int("exchangeApiId").notNull(),
  multiplier: decimal("multiplier", { precision: 10, scale: 2 }).default("1").notNull(),
  isEnabled: boolean("isEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var signalLogs = mysqlTable("signal_logs", {
  id: int("id").autoincrement().primaryKey(),
  signalSourceId: int("signalSourceId").notNull(),
  action: mysqlEnum("action", ["open_long", "open_short", "close_long", "close_short", "close_all"]).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }),
  rawPayload: text("rawPayload"),
  processedAt: timestamp("processedAt"),
  totalUsers: int("totalUsers").default(0),
  successCount: int("successCount").default(0),
  failCount: int("failCount").default(0),
  executionTimeMs: int("executionTimeMs"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var copyOrders = mysqlTable("copy_orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  signalLogId: int("signalLogId").notNull(),
  signalSourceId: int("signalSourceId").notNull(),
  exchangeApiId: int("exchangeApiId").notNull(),
  exchange: mysqlEnum("exchange", ["binance", "okx", "bybit", "bitget", "gate"]).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  action: mysqlEnum("action", ["open_long", "open_short", "close_long", "close_short", "close_all"]).notNull(),
  multiplier: decimal("multiplier", { precision: 10, scale: 2 }).notNull(),
  signalQuantity: decimal("signalQuantity", { precision: 20, scale: 8 }).notNull(),
  actualQuantity: decimal("actualQuantity", { precision: 20, scale: 8 }).notNull(),
  openPrice: decimal("openPrice", { precision: 20, scale: 8 }),
  closePrice: decimal("closePrice", { precision: 20, scale: 8 }),
  openTime: timestamp("openTime"),
  closeTime: timestamp("closeTime"),
  exchangeOrderId: varchar("exchangeOrderId", { length: 128 }),
  closeOrderId: varchar("closeOrderId", { length: 128 }),
  realizedPnl: decimal("realizedPnl", { precision: 20, scale: 8 }),
  fee: decimal("fee", { precision: 20, scale: 8 }),
  netPnl: decimal("netPnl", { precision: 20, scale: 8 }),
  revenueShareDeducted: decimal("revenueShareDeducted", { precision: 20, scale: 8 }).default("0"),
  status: mysqlEnum("status", ["pending", "open", "closed", "failed", "cancelled"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  isAbnormal: boolean("isAbnormal").default(false).notNull(),
  abnormalNote: text("abnormalNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var revenueShareRecords = mysqlTable("revenue_share_records", {
  id: int("id").autoincrement().primaryKey(),
  copyOrderId: int("copyOrderId").notNull(),
  traderId: int("traderId").notNull(),
  recipientId: int("recipientId").notNull(),
  level: int("level").notNull(),
  traderPnl: decimal("traderPnl", { precision: 20, scale: 8 }).notNull(),
  ratio: decimal("ratio", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var depositAddresses = mysqlTable("deposit_addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  address: varchar("address", { length: 128 }).notNull().unique(),
  derivationIndex: int("derivationIndex").notNull(),
  network: varchar("network", { length: 32 }).default("BSC").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var deposits = mysqlTable("deposits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  txHash: varchar("txHash", { length: 128 }),
  fromAddress: varchar("fromAddress", { length: 128 }),
  toAddress: varchar("toAddress", { length: 128 }),
  proofNote: text("proofNote"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewNote: text("reviewNote"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var withdrawals = mysqlTable("withdrawals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  fee: decimal("fee", { precision: 20, scale: 8 }).default("0").notNull(),
  netAmount: decimal("netAmount", { precision: 20, scale: 8 }).notNull(),
  toAddress: varchar("toAddress", { length: 128 }).notNull(),
  network: varchar("network", { length: 32 }).default("BSC").notNull(),
  txHash: varchar("txHash", { length: 128 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "processing", "completed"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewNote: text("reviewNote"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var fundTransactions = mysqlTable("fund_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["deposit", "withdrawal", "revenue_share_in", "revenue_share_out", "admin_adjust"]).notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 20, scale: 8 }).notNull(),
  relatedId: int("relatedId"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var pointsTransactions = mysqlTable("points_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["redeem", "transfer_out", "transfer_in", "admin_add", "admin_deduct"]).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  balanceAfter: bigint("balanceAfter", { mode: "number" }).notNull(),
  relatedUserId: int("relatedUserId"),
  note: text("note"),
  redeemMonth: varchar("redeemMonth", { length: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var systemConfig = mysqlTable("system_config", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod"];
  const assignNullable = (field) => {
    const value = user[field];
    if (value === void 0) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserByInviteCode(inviteCode) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.inviteCode, inviteCode)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createEmailUser(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `email_${data.email}_${Date.now()}`;
  await db.insert(users).values({
    openId,
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    inviteCode: data.inviteCode,
    referrerId: data.referrerId,
    revenueShareRatio: data.revenueShareRatio ?? "50.00",
    loginMethod: "email",
    role: "user",
    lastSignedIn: /* @__PURE__ */ new Date()
  });
  return getUserByEmail(data.email);
}
async function updateUser(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, id));
}
async function listUsers(page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const items = await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql`count(*)` }).from(users);
  return { items, total: Number(count) };
}
async function searchUsers(keyword, page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const isNumeric = /^\d+$/.test(keyword.trim());
  let where;
  if (isNumeric) {
    where = eq(users.id, parseInt(keyword.trim()));
  } else {
    where = or(
      like(users.name, `%${keyword}%`),
      like(users.email, `%${keyword}%`)
    );
  }
  const items = await db.select().from(users).where(where).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql`count(*)` }).from(users).where(where);
  return { items, total: Number(count) };
}
async function getAdminUser() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  return result[0] ?? null;
}
async function getUserReferralChain(userId) {
  const db = await getDb();
  if (!db) return [];
  const chain = [];
  const trader = await getUserById(userId);
  if (!trader || !trader.referrerId) return [];
  let currentReferrerId = trader.referrerId;
  const visited = /* @__PURE__ */ new Set();
  while (currentReferrerId) {
    if (visited.has(currentReferrerId)) break;
    visited.add(currentReferrerId);
    const ancestor = await getUserById(currentReferrerId);
    if (!ancestor) break;
    chain.push({ id: ancestor.id, revenueShareRatio: ancestor.revenueShareRatio });
    currentReferrerId = ancestor.referrerId ?? null;
  }
  return chain;
}
async function createVerificationCode(email, type, code) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
  await db.insert(emailVerificationCodes).values({ email, code, type, expiresAt });
}
async function verifyCode(email, code, type) {
  const db = await getDb();
  if (!db) return false;
  const now = /* @__PURE__ */ new Date();
  const result = await db.select().from(emailVerificationCodes).where(and(
    eq(emailVerificationCodes.email, email),
    eq(emailVerificationCodes.code, code),
    eq(emailVerificationCodes.type, type),
    eq(emailVerificationCodes.used, false),
    gte(emailVerificationCodes.expiresAt, now)
  )).limit(1);
  if (result.length === 0) return false;
  await db.update(emailVerificationCodes).set({ used: true }).where(eq(emailVerificationCodes.id, result[0].id));
  return true;
}
async function getExchangeApisByUserId(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(exchangeApis).where(eq(exchangeApis.userId, userId)).orderBy(desc(exchangeApis.createdAt));
}
async function getExchangeApiById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(exchangeApis).where(eq(exchangeApis.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createExchangeApi(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(exchangeApis).values(data);
}
async function updateExchangeApi(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(exchangeApis).set(data).where(eq(exchangeApis.id, id));
}
async function deleteExchangeApi(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(exchangeApis).where(eq(exchangeApis.id, id));
}
async function listSignalSources(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) return db.select().from(signalSources).where(eq(signalSources.isActive, true));
  return db.select().from(signalSources).orderBy(desc(signalSources.createdAt));
}
async function getSignalSourceById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(signalSources).where(eq(signalSources.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createSignalSource(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(signalSources).values(data);
}
async function updateSignalSource(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(signalSources).set(data).where(eq(signalSources.id, id));
}
async function getUserStrategies(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userStrategies).where(eq(userStrategies.userId, userId));
}
async function getUserStrategy(userId, signalSourceId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(userStrategies).where(and(eq(userStrategies.userId, userId), eq(userStrategies.signalSourceId, signalSourceId))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function upsertUserStrategy(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserStrategy(data.userId, data.signalSourceId);
  if (existing) {
    await db.update(userStrategies).set(data).where(eq(userStrategies.id, existing.id));
  } else {
    await db.insert(userStrategies).values(data);
  }
}
async function disableAllUserStrategies(userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(userStrategies).set({ isEnabled: false }).where(eq(userStrategies.userId, userId));
}
async function disableStrategiesByExchangeApiId(exchangeApiId) {
  const db = await getDb();
  if (!db) return;
  await db.update(userStrategies).set({ isEnabled: false }).where(eq(userStrategies.exchangeApiId, exchangeApiId));
}
async function getEnabledStrategiesForSignal(signalSourceId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userStrategies).where(and(eq(userStrategies.signalSourceId, signalSourceId), eq(userStrategies.isEnabled, true)));
}
async function createSignalLog(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(signalLogs).values(data);
  return result[0].insertId;
}
async function updateSignalLog(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(signalLogs).set(data).where(eq(signalLogs.id, id));
}
async function listSignalLogs(signalSourceId, page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const where = signalSourceId ? eq(signalLogs.signalSourceId, signalSourceId) : void 0;
  const items = where ? await db.select().from(signalLogs).where(where).orderBy(desc(signalLogs.createdAt)).limit(limit).offset(offset) : await db.select().from(signalLogs).orderBy(desc(signalLogs.createdAt)).limit(limit).offset(offset);
  const countQuery = where ? await db.select({ count: sql`count(*)` }).from(signalLogs).where(where) : await db.select({ count: sql`count(*)` }).from(signalLogs);
  return { items, total: Number(countQuery[0].count) };
}
async function createCopyOrder(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(copyOrders).values(data).$returningId();
  return result.id;
}
async function updateCopyOrder(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(copyOrders).set(data).where(eq(copyOrders.id, id));
}
async function findAllUserOpenOrders(userId, symbol, action) {
  const db = await getDb();
  if (!db) return [];
  const openAction = action === "close_long" || action === "reduce_long" ? "open_long" : "open_short";
  const results = await db.select().from(copyOrders).where(
    and(
      eq(copyOrders.userId, userId),
      eq(copyOrders.symbol, symbol),
      eq(copyOrders.action, openAction),
      eq(copyOrders.status, "open")
    )
  ).orderBy(copyOrders.createdAt);
  return results;
}
async function listCopyOrdersBySignalLog(signalLogId, userId) {
  const db = await getDb();
  if (!db) return [];
  const conditions = userId ? and(eq(copyOrders.signalLogId, signalLogId), eq(copyOrders.userId, userId)) : eq(copyOrders.signalLogId, signalLogId);
  return db.select().from(copyOrders).where(conditions).orderBy(desc(copyOrders.createdAt));
}
async function listCopyOrders(userId, page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const where = userId ? and(eq(copyOrders.userId, userId), ne(copyOrders.status, "cancelled")) : ne(copyOrders.status, "cancelled");
  const items = await db.select().from(copyOrders).where(where).orderBy(desc(copyOrders.createdAt)).limit(limit).offset(offset);
  const countQuery = await db.select({ count: sql`count(*)` }).from(copyOrders).where(where);
  return { items, total: Number(countQuery[0].count) };
}
async function listAllCopyOrdersWithUser(page = 1, limit = 30) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const items = await db.select({
    id: copyOrders.id,
    userId: copyOrders.userId,
    userName: users.name,
    signalSourceId: copyOrders.signalSourceId,
    exchange: copyOrders.exchange,
    symbol: copyOrders.symbol,
    action: copyOrders.action,
    multiplier: copyOrders.multiplier,
    signalQuantity: copyOrders.signalQuantity,
    actualQuantity: copyOrders.actualQuantity,
    openPrice: copyOrders.openPrice,
    closePrice: copyOrders.closePrice,
    openTime: copyOrders.openTime,
    closeTime: copyOrders.closeTime,
    exchangeOrderId: copyOrders.exchangeOrderId,
    realizedPnl: copyOrders.realizedPnl,
    fee: copyOrders.fee,
    netPnl: copyOrders.netPnl,
    status: copyOrders.status,
    errorMessage: copyOrders.errorMessage,
    isAbnormal: copyOrders.isAbnormal,
    abnormalNote: copyOrders.abnormalNote,
    createdAt: copyOrders.createdAt,
    signalSourceName: signalSources.name
  }).from(copyOrders).leftJoin(users, eq(copyOrders.userId, users.id)).leftJoin(signalSources, eq(copyOrders.signalSourceId, signalSources.id)).where(ne(copyOrders.status, "cancelled")).orderBy(desc(copyOrders.createdAt)).limit(limit).offset(offset);
  const adminWhere = ne(copyOrders.status, "cancelled");
  const countQuery = await db.select({ count: sql`count(*)` }).from(copyOrders).where(adminWhere);
  return { items, total: Number(countQuery[0].count) };
}
async function getUserOrderStats(userId) {
  const db = await getDb();
  if (!db) return { totalProfit: 0, totalLoss: 0, netPnl: 0, totalOrders: 0, openOrders: 0 };
  const closeResult = await db.select({
    totalProfit: sql`COALESCE(SUM(CASE WHEN netPnl > 0 THEN netPnl ELSE 0 END), 0)`,
    totalLoss: sql`COALESCE(SUM(CASE WHEN netPnl < 0 THEN ABS(netPnl) ELSE 0 END), 0)`,
    totalOrders: sql`COUNT(*)`,
    totalRevenueShare: sql`COALESCE(SUM(COALESCE(revenueShareDeducted, 0)), 0)`
  }).from(copyOrders).where(
    and(
      eq(copyOrders.userId, userId),
      ne(copyOrders.status, "cancelled"),
      // Only count close orders — realized PnL is recorded on close trades
      sql`action IN ('close_long', 'close_short')`
    )
  );
  const openResult = await db.select({
    openOrders: sql`COUNT(*)`
  }).from(copyOrders).where(
    and(
      eq(copyOrders.userId, userId),
      eq(copyOrders.status, "open"),
      sql`action IN ('open_long', 'open_short')`
    )
  );
  const row = closeResult[0];
  const totalProfit = parseFloat(row.totalProfit || "0");
  const totalLoss = parseFloat(row.totalLoss || "0");
  const totalRevenueShare = parseFloat(row.totalRevenueShare || "0");
  return { totalProfit, totalLoss, netPnl: totalProfit - totalLoss, totalOrders: Number(row.totalOrders), openOrders: Number(openResult[0].openOrders), totalRevenueShare };
}
async function createRevenueShareRecords(records) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (records.length === 0) return;
  await db.insert(revenueShareRecords).values(records);
}
async function listRevenueShareRecords(userId, page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const where = userId ? eq(revenueShareRecords.recipientId, userId) : void 0;
  const items = where ? await db.select().from(revenueShareRecords).where(where).orderBy(desc(revenueShareRecords.createdAt)).limit(limit).offset(offset) : await db.select().from(revenueShareRecords).orderBy(desc(revenueShareRecords.createdAt)).limit(limit).offset(offset);
  const countQuery = where ? await db.select({ count: sql`count(*)` }).from(revenueShareRecords).where(where) : await db.select({ count: sql`count(*)` }).from(revenueShareRecords);
  return { items, total: Number(countQuery[0].count) };
}
async function getUserRevenueShareStats(userId) {
  const db = await getDb();
  if (!db) return { totalReceived: 0, totalDeducted: 0 };
  const received = await db.select({ total: sql`COALESCE(SUM(amount), 0)` }).from(revenueShareRecords).where(eq(revenueShareRecords.recipientId, userId));
  const deducted = await db.select({ total: sql`COALESCE(SUM(revenueShareDeducted), 0)` }).from(copyOrders).where(
    and(
      eq(copyOrders.userId, userId),
      sql`action IN ('close_long', 'close_short')`,
      eq(copyOrders.status, "closed")
    )
  );
  return {
    totalReceived: parseFloat(received[0].total || "0"),
    totalDeducted: parseFloat(deducted[0].total || "0")
  };
}
async function addPointsTransaction(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(pointsTransactions).values(data);
}
async function listPointsTransactions(userId, page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const items = await db.select().from(pointsTransactions).where(eq(pointsTransactions.userId, userId)).orderBy(desc(pointsTransactions.createdAt)).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql`count(*)` }).from(pointsTransactions).where(eq(pointsTransactions.userId, userId));
  return { items, total: Number(count) };
}
async function listAllPointsTransactions(page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const items = await db.select().from(pointsTransactions).orderBy(desc(pointsTransactions.createdAt)).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql`count(*)` }).from(pointsTransactions);
  return { items, total: Number(count) };
}
async function createDeposit(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(deposits).values(data);
}
async function listDeposits(userId, page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const where = userId ? eq(deposits.userId, userId) : void 0;
  const items = where ? await db.select().from(deposits).where(where).orderBy(desc(deposits.createdAt)).limit(limit).offset(offset) : await db.select().from(deposits).orderBy(desc(deposits.createdAt)).limit(limit).offset(offset);
  const countQuery = where ? await db.select({ count: sql`count(*)` }).from(deposits).where(where) : await db.select({ count: sql`count(*)` }).from(deposits);
  return { items, total: Number(countQuery[0].count) };
}
async function updateDeposit(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(deposits).set(data).where(eq(deposits.id, id));
}
async function createWithdrawal(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(withdrawals).values(data);
}
async function listWithdrawals(userId, page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const where = userId ? eq(withdrawals.userId, userId) : void 0;
  const items = where ? await db.select().from(withdrawals).where(where).orderBy(desc(withdrawals.createdAt)).limit(limit).offset(offset) : await db.select().from(withdrawals).orderBy(desc(withdrawals.createdAt)).limit(limit).offset(offset);
  const countQuery = where ? await db.select({ count: sql`count(*)` }).from(withdrawals).where(where) : await db.select({ count: sql`count(*)` }).from(withdrawals);
  return { items, total: Number(countQuery[0].count) };
}
async function updateWithdrawal(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(withdrawals).set(data).where(eq(withdrawals.id, id));
}
async function addFundTransaction(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(fundTransactions).values(data);
}
async function listFundTransactions(userId, page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const where = userId ? eq(fundTransactions.userId, userId) : void 0;
  const items = where ? await db.select().from(fundTransactions).where(where).orderBy(desc(fundTransactions.createdAt)).limit(limit).offset(offset) : await db.select().from(fundTransactions).orderBy(desc(fundTransactions.createdAt)).limit(limit).offset(offset);
  const countQuery = where ? await db.select({ count: sql`count(*)` }).from(fundTransactions).where(where) : await db.select({ count: sql`count(*)` }).from(fundTransactions);
  return { items, total: Number(countQuery[0].count) };
}
async function getSystemConfig(key) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);
  return result.length > 0 ? result[0].value : void 0;
}
async function setSystemConfig(key, value) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(systemConfig).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}
async function listSystemConfig() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemConfig);
}
async function getAdminDashboardStats() {
  const db = await getDb();
  if (!db) return null;
  const [userCount] = await db.select({ count: sql`count(*)` }).from(users);
  const [depositStats] = await db.select({
    total: sql`COALESCE(SUM(amount), 0)`,
    pending: sql`SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END)`
  }).from(deposits).where(eq(deposits.status, "approved"));
  const [withdrawalStats] = await db.select({
    total: sql`COALESCE(SUM(amount), 0)`,
    pending: sql`SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END)`
  }).from(withdrawals);
  const [orderStats] = await db.select({
    totalProfit: sql`COALESCE(SUM(CASE WHEN netPnl > 0 THEN netPnl ELSE 0 END), 0)`,
    totalLoss: sql`COALESCE(SUM(CASE WHEN netPnl < 0 THEN ABS(netPnl) ELSE 0 END), 0)`,
    totalDeducted: sql`COALESCE(SUM(revenueShareDeducted), 0)`,
    abnormal: sql`SUM(CASE WHEN isAbnormal = 1 THEN 1 ELSE 0 END)`
  }).from(copyOrders).where(sql`action IN ('close_long', 'close_short') AND status = 'closed'`);
  const [shareStats] = await db.select({
    total: sql`COALESCE(SUM(${revenueShareRecords.amount}), 0)`
  }).from(revenueShareRecords).innerJoin(copyOrders, eq(revenueShareRecords.copyOrderId, copyOrders.id)).where(sql`${copyOrders.action} IN ('close_long', 'close_short') AND ${copyOrders.status} = 'closed'`);
  const totalDeducted = parseFloat(orderStats.totalDeducted || "0");
  const totalRevenueShare = parseFloat(shareStats.total || "0");
  return {
    totalUsers: Number(userCount.count),
    totalDeposits: parseFloat(depositStats.total || "0"),
    pendingDeposits: Number(depositStats.pending || 0),
    totalWithdrawals: parseFloat(withdrawalStats.total || "0"),
    pendingWithdrawals: Number(withdrawalStats.pending || 0),
    // 用户维度
    totalProfit: parseFloat(orderStats.totalProfit || "0"),
    totalLoss: parseFloat(orderStats.totalLoss || "0"),
    // 平台收入维度
    totalDeducted,
    // 从用户余额扣除的服务费总额
    totalRevenueShare,
    // 分给推荐人的分成总额
    platformNetRevenue: totalDeducted - totalRevenueShare,
    // 平台净收入
    abnormalOrders: Number(orderStats.abnormal || 0)
  };
}
async function getTeamStats(userId) {
  const db = await getDb();
  if (!db) return { directCount: 0, totalCount: 0, teamProfit: 0, teamRevenueShare: 0 };
  const [direct] = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.referrerId, userId));
  const allTeamIds = [];
  let currentLevelIds = (await db.select({ id: users.id }).from(users).where(eq(users.referrerId, userId))).map((m) => m.id);
  const directIds = [...currentLevelIds];
  while (currentLevelIds.length > 0) {
    allTeamIds.push(...currentLevelIds);
    const nextLevel = await db.select({ id: users.id }).from(users).where(sql`referrerId IN (${currentLevelIds.join(",")})`);
    currentLevelIds = nextLevel.map((m) => m.id);
  }
  const totalCount = allTeamIds.length;
  let teamProfit = 0;
  if (allTeamIds.length > 0) {
    const [profitResult] = await db.select({ total: sql`COALESCE(SUM(netPnl), 0)` }).from(copyOrders).where(sql`userId IN (${allTeamIds.join(",")}) AND action IN ('close_long', 'close_short') AND status = 'closed'`);
    teamProfit = parseFloat(profitResult.total || "0");
  }
  const [shareResult] = await db.select({ total: sql`COALESCE(SUM(${revenueShareRecords.amount}), 0)` }).from(revenueShareRecords).innerJoin(copyOrders, eq(revenueShareRecords.copyOrderId, copyOrders.id)).where(
    and(
      eq(revenueShareRecords.recipientId, userId),
      sql`${copyOrders.action} IN ('close_long', 'close_short')`,
      eq(copyOrders.status, "closed")
    )
  );
  return {
    directCount: Number(direct.count),
    totalCount,
    teamProfit,
    teamRevenueShare: parseFloat(shareResult.total || "0")
  };
}
async function getMyInvitees(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    revenueShareRatio: users.revenueShareRatio,
    isActive: users.isActive,
    createdAt: users.createdAt
  }).from(users).where(eq(users.referrerId, userId)).orderBy(sql`${users.createdAt} DESC`);
}

// server/routers/auth.ts
init_crypto();

// server/email.ts
async function sendVerificationEmail(email, code, type) {
  const typeLabels = {
    register: "\u6CE8\u518C\u9A8C\u8BC1\u7801",
    login: "\u767B\u5F55\u9A8C\u8BC1\u7801",
    reset_password: "\u91CD\u7F6E\u5BC6\u7801\u9A8C\u8BC1\u7801"
  };
  const label = typeLabels[type];
  console.log(`[Email] Sending ${label} to ${email}: ${code} (valid for 10 minutes)`);
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // SameSite=None requires Secure=true (HTTPS). For HTTP deployments use lax.
    sameSite: secure ? "none" : "lax",
    secure
  };
}

// server/routers/auth.ts
import { SignJWT } from "jose";
var authRouter = router({
  me: publicProcedure.query((opts) => {
    if (!opts.ctx.user) return null;
    const { passwordHash, ...safeUser } = opts.ctx.user;
    return safeUser;
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),
  sendCode: publicProcedure.input(z2.object({
    email: z2.string().email(),
    type: z2.enum(["register", "login", "reset_password"])
  })).mutation(async ({ input }) => {
    const code = generateVerificationCode();
    await createVerificationCode(input.email, input.type, code);
    await sendVerificationEmail(input.email, code, input.type);
    return { success: true };
  }),
  register: publicProcedure.input(z2.object({
    email: z2.string().email(),
    password: z2.string().min(8),
    name: z2.string().min(1).max(50),
    inviteCode: z2.string().min(1, "\u9080\u8BF7\u7801\u4E3A\u5FC5\u586B\u9879")
  })).mutation(async ({ input, ctx }) => {
    const existing = await getUserByEmail(input.email);
    if (existing) throw new TRPCError2({ code: "CONFLICT", message: "\u8BE5\u90AE\u7BB1\u5DF2\u6CE8\u518C" });
    const referrer = await getUserByInviteCode(input.inviteCode);
    if (!referrer) throw new TRPCError2({ code: "BAD_REQUEST", message: "\u9080\u8BF7\u7801\u65E0\u6548" });
    const referrerId = referrer.id;
    const passwordHash = hashPassword(input.password);
    const myInviteCode = generateInviteCode();
    const user = await createEmailUser({
      email: input.email,
      passwordHash,
      name: input.name,
      inviteCode: myInviteCode,
      referrerId,
      revenueShareRatio: "50.00"
    });
    if (!user) throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "\u6CE8\u518C\u5931\u8D25" });
    const token = await new SignJWT({ id: user.id, openId: user.openId, role: user.role, appId: ENV.appId, name: user.name ?? "" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(new TextEncoder().encode(ENV.cookieSecret));
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1e3 });
    return { success: true, user: { id: user.id, email: user.email, name: user.name } };
  }),
  login: publicProcedure.input(z2.object({
    email: z2.string().email(),
    password: z2.string()
  })).mutation(async ({ input, ctx }) => {
    const user = await getUserByEmail(input.email);
    if (!user || !user.passwordHash) throw new TRPCError2({ code: "UNAUTHORIZED", message: "\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF" });
    if (!user.isActive) throw new TRPCError2({ code: "FORBIDDEN", message: "\u8D26\u6237\u5DF2\u88AB\u7981\u7528" });
    const valid = verifyPassword(input.password, user.passwordHash);
    if (!valid) throw new TRPCError2({ code: "UNAUTHORIZED", message: "\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF" });
    await updateUser(user.id, { lastSignedIn: /* @__PURE__ */ new Date() });
    const token = await new SignJWT({ id: user.id, openId: user.openId, role: user.role, appId: ENV.appId, name: user.name ?? "" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(new TextEncoder().encode(ENV.cookieSecret));
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1e3 });
    return { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }),
  resetPassword: publicProcedure.input(z2.object({
    email: z2.string().email(),
    code: z2.string().min(6),
    newPassword: z2.string().min(8)
  })).mutation(async ({ input }) => {
    const valid = await verifyCode(input.email, input.code, "reset_password");
    if (!valid) throw new TRPCError2({ code: "BAD_REQUEST", message: "\u9A8C\u8BC1\u7801\u65E0\u6548\u6216\u5DF2\u8FC7\u671F" });
    const user = await getUserByEmail(input.email);
    if (!user) throw new TRPCError2({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
    await updateUser(user.id, { passwordHash: hashPassword(input.newPassword) });
    return { success: true };
  })
});

// server/routers/exchange.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z3 } from "zod";
init_crypto();

// server/binance-client.ts
import crypto2 from "crypto";
var BASE_URL = "https://fapi.binance.com";
function sign(secretKey, queryString) {
  return crypto2.createHmac("sha256", secretKey).update(queryString).digest("hex");
}
async function binanceRequest(creds, method, path2, params = {}) {
  const timestamp2 = Date.now();
  const allParams = { ...params, timestamp: timestamp2 };
  const queryString = Object.entries(allParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  const signature = sign(creds.secretKey, queryString);
  const fullQuery = `${queryString}&signature=${signature}`;
  const url = method === "GET" || method === "DELETE" ? `${BASE_URL}${path2}?${fullQuery}` : `${BASE_URL}${path2}`;
  const res = await fetch(url, {
    method,
    headers: {
      "X-MBX-APIKEY": creds.apiKey,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: method === "POST" ? fullQuery : void 0
  });
  const text2 = await res.text();
  const safeText = text2.replace(/"orderId"\s*:\s*(\d{15,})/g, '"orderId":"$1"');
  const data = JSON.parse(safeText);
  if (data.code && data.code < 0) {
    throw new Error(`Binance API error ${data.code}: ${data.msg}`);
  }
  return data;
}
function toBinanceSymbol(instId) {
  const parts = instId.split("-");
  if (parts.length >= 2) {
    return parts[0] + parts[1];
  }
  return instId.replace(/-/g, "");
}
async function testBinanceApi(creds) {
  const checks = [];
  let accountOk = false;
  try {
    await binanceRequest(creds, "GET", "/fapi/v2/account", {});
    accountOk = true;
    checks.push({ name: "API\u5BC6\u94A5\u6709\u6548\u6027", passed: true, detail: "API Key \u9A8C\u8BC1\u901A\u8FC7\uFF0C\u5408\u7EA6\u8D26\u6237\u53EF\u8BBF\u95EE" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    let detail = "API Key \u65E0\u6548\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u751F\u6210";
    if (msg.includes("-2015")) detail = "API Key \u65E0\u6548\u3001IP\u672A\u5728\u767D\u540D\u5355\uFF0C\u6216\u672A\u5F00\u542F\u5408\u7EA6\u4EA4\u6613\u6743\u9650";
    else if (msg.includes("-1022")) detail = "Secret Key \u9519\u8BEF\uFF0C\u7B7E\u540D\u9A8C\u8BC1\u5931\u8D25";
    else if (msg.includes("-1100") || msg.includes("-1102")) detail = "\u8BF7\u6C42\u53C2\u6570\u9519\u8BEF";
    checks.push({ name: "API\u5BC6\u94A5\u6709\u6548\u6027", passed: false, detail });
    return {
      success: false,
      message: `\u9A8C\u8BC1\u5931\u8D25\uFF1A${detail}`,
      checks
    };
  }
  if (accountOk) {
    try {
      const data = await binanceRequest(creds, "GET", "/fapi/v1/positionSide/dual", {});
      if (data.dualSidePosition === true) {
        checks.push({ name: "\u6301\u4ED3\u6A21\u5F0F", passed: true, detail: "\u53CC\u5411\u6301\u4ED3\u6A21\u5F0F\uFF08\u5BF9\u51B2\u6A21\u5F0F\uFF09\uFF0C\u7B26\u5408\u8DDF\u5355\u8981\u6C42" });
      } else {
        checks.push({
          name: "\u6301\u4ED3\u6A21\u5F0F",
          passed: false,
          detail: "\u5F53\u524D\u4E3A\u5355\u5411\u6301\u4ED3\u6A21\u5F0F\uFF0C\u8BF7\u5728\u5E01\u5B89\u5408\u7EA6\u9875\u9762 \u2192 \u8BBE\u7F6E \u2192 \u6301\u4ED3\u6A21\u5F0F\uFF0C\u5207\u6362\u4E3A\u300C\u53CC\u5411\u6301\u4ED3\u300D\u540E\u91CD\u65B0\u6D4B\u8BD5"
        });
      }
    } catch {
      checks.push({ name: "\u6301\u4ED3\u6A21\u5F0F", passed: false, detail: "\u6301\u4ED3\u6A21\u5F0F\u67E5\u8BE2\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4\u5408\u7EA6\u8D26\u6237\u5DF2\u5F00\u901A" });
    }
  }
  const allPassed = checks.every((c) => c.passed);
  const failedChecks = checks.filter((c) => !c.passed);
  if (allPassed) {
    return { success: true, message: "\u8FDE\u63A5\u6210\u529F\uFF0C\u6240\u6709\u68C0\u6D4B\u9879\u901A\u8FC7", checks };
  } else {
    const summary = failedChecks.map((c) => c.detail).join("\uFF1B");
    return { success: false, message: summary, checks };
  }
}
var hedgeModeCache = /* @__PURE__ */ new Map();
async function isHedgeMode(creds) {
  const cacheKey = creds.apiKey;
  const cached = hedgeModeCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.value;
  try {
    const data = await binanceRequest(creds, "GET", "/fapi/v1/positionSide/dual", {});
    const result = data.dualSidePosition === true;
    hedgeModeCache.set(cacheKey, { value: result, expiry: Date.now() + 2 * 60 * 1e3 });
    return result;
  } catch {
    return false;
  }
}
var leverageCache = /* @__PURE__ */ new Map();
async function setLeverage(creds, symbol, leverage) {
  const cacheKey = `${creds.apiKey}_${symbol}_${leverage}`;
  if (leverageCache.has(cacheKey)) return;
  try {
    await binanceRequest(creds, "POST", "/fapi/v1/leverage", { symbol, leverage });
    console.log(`[Binance] Leverage set to ${leverage}x for ${symbol}`);
    leverageCache.set(cacheKey, Date.now());
    setTimeout(() => leverageCache.delete(cacheKey), 5 * 60 * 1e3);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("-4028") || msg.includes("4028")) {
      leverageCache.set(cacheKey, Date.now());
      setTimeout(() => leverageCache.delete(cacheKey), 5 * 60 * 1e3);
    } else {
      console.warn(`[Binance] Failed to set leverage: ${msg}`);
    }
  }
}
async function placeBinanceOrder(creds, instId, side, positionSide, quantity, isClose = false) {
  const symbol = toBinanceSymbol(instId);
  const hedgeMode = await isHedgeMode(creds);
  if (!isClose) {
    await setLeverage(creds, symbol, 20);
  }
  console.log(`[Binance] Order: symbol=${symbol}, side=${side}, positionSide=${positionSide}, qty=${quantity}, hedgeMode=${hedgeMode}, isClose=${isClose}`);
  if (hedgeMode) {
    return binanceRequest(creds, "POST", "/fapi/v1/order", {
      symbol,
      side,
      positionSide,
      type: "MARKET",
      quantity
    });
  } else {
    const params = {
      symbol,
      side,
      type: "MARKET",
      quantity
    };
    if (isClose) params.reduceOnly = true;
    console.log(`[Binance] One-way params:`, JSON.stringify(params));
    return binanceRequest(creds, "POST", "/fapi/v1/order", params);
  }
}
async function closeBinancePosition(creds, instId, positionSide, quantity) {
  const side = positionSide === "LONG" ? "SELL" : "BUY";
  return placeBinanceOrder(creds, instId, side, positionSide, quantity, true);
}
async function getBinanceOrderDetail(creds, symbol, orderId) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const trades = await binanceRequest(
        creds,
        "GET",
        "/fapi/v1/userTrades",
        { symbol, orderId, limit: 50 }
      );
      if (trades && trades.length > 0) {
        const totalQty = trades.reduce((sum, t2) => sum + parseFloat(t2.qty || "0"), 0);
        const avgPrice = totalQty > 0 ? (trades.reduce((sum, t2) => sum + parseFloat(t2.price || "0") * parseFloat(t2.qty || "0"), 0) / totalQty).toFixed(8) : "0";
        const commission = trades.filter((t2) => t2.commissionAsset === "USDT").reduce((sum, t2) => sum + parseFloat(t2.commission || "0"), 0).toFixed(8);
        const realizedPnl = trades.reduce((sum, t2) => sum + parseFloat(t2.realizedPnl || "0"), 0).toFixed(8);
        return {
          avgPrice,
          executedQty: totalQty.toFixed(8),
          realizedPnl,
          commission,
          status: "FILLED"
        };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[Binance] getBinanceOrderDetail attempt ${attempt} failed: ${msg}`);
    }
    if (attempt < 3) {
      const delay = attempt === 1 ? 3e3 : 5e3;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`Binance API error -2013: Order does not exist.`);
}
var binanceInstrumentCache = /* @__PURE__ */ new Map();
async function getBinanceInstrument(symbol) {
  const cached = binanceInstrumentCache.get(symbol);
  if (cached && Date.now() < cached.expiry) return cached.data;
  try {
    const data = await fetch(`${BASE_URL}/fapi/v1/exchangeInfo`).then((r) => r.json());
    const info = data.symbols.find((s) => s.symbol === symbol);
    if (!info) return null;
    const lotFilter = info.filters.find((f) => f.filterType === "LOT_SIZE");
    const result = {
      quantityPrecision: info.quantityPrecision,
      pricePrecision: info.pricePrecision,
      minQty: lotFilter?.minQty ?? "0.001"
    };
    binanceInstrumentCache.set(symbol, { data: result, expiry: Date.now() + 5 * 60 * 1e3 });
    return result;
  } catch {
    return null;
  }
}

// server/okx-client.ts
import crypto3 from "crypto";
import https from "https";
function sign2(secretKey, timestamp2, method, requestPath, body = "") {
  const message = timestamp2 + method.toUpperCase() + requestPath + body;
  return crypto3.createHmac("sha256", secretKey).update(message).digest("base64");
}
function getTimestamp() {
  return (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z$/, ".000Z");
}
async function okxRequest(creds, method, path2, body) {
  const ts = getTimestamp();
  const bodyStr = body ? JSON.stringify(body) : "";
  const sig = sign2(creds.secretKey, ts, method, path2, bodyStr);
  const headers = {
    "OK-ACCESS-KEY": creds.apiKey,
    "OK-ACCESS-SIGN": sig,
    "OK-ACCESS-TIMESTAMP": ts,
    "OK-ACCESS-PASSPHRASE": creds.passphrase,
    "Content-Type": "application/json"
  };
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "www.okx.com",
      path: path2,
      method,
      headers
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Invalid JSON: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}
async function placeOrder(creds, instId, side, posSide, sz, ordType = "market", px) {
  const body = {
    instId,
    tdMode: "cross",
    // cross margin
    side,
    posSide,
    ordType,
    sz
  };
  if (ordType === "limit" && px) body.px = px;
  const res = await okxRequest(creds, "POST", "/api/v5/trade/order", body);
  if (res.code !== "0") throw new Error(`OKX placeOrder error: ${res.code} ${res.msg}`);
  const result = res.data?.[0];
  if (!result) throw new Error("OKX placeOrder: no result returned");
  if (result.sCode !== "0") throw new Error(`OKX placeOrder rejected: ${result.sCode} ${result.sMsg}`);
  return result;
}
async function closePosition(creds, instId, posSide, sz) {
  const side = posSide === "long" ? "sell" : "buy";
  return placeOrder(creds, instId, side, posSide, sz, "market");
}
async function getOkxOrderDetail(creds, instId, ordId) {
  const path2 = `/api/v5/trade/order?instId=${instId}&ordId=${ordId}`;
  const res = await okxRequest(
    creds,
    "GET",
    path2
  );
  const order = res.data?.[0];
  return {
    avgPx: order?.avgPx || "0",
    fillSz: order?.fillSz || "0",
    fee: order?.fee || "0",
    pnl: order?.pnl || "0",
    state: order?.state || "unknown"
  };
}
var instrumentCache = /* @__PURE__ */ new Map();
async function getInstrument(instId) {
  const cached = instrumentCache.get(instId);
  if (cached && Date.now() < cached.expiry) return cached.data;
  return new Promise((resolve) => {
    const path2 = `/api/v5/public/instruments?instType=SWAP&instId=${instId}`;
    https.get(`https://www.okx.com${path2}`, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const inst = json.data?.[0];
          if (!inst) return resolve(null);
          const result = { ctVal: inst.ctVal, minSz: inst.minSz, lotSz: inst.lotSz };
          instrumentCache.set(instId, { data: result, expiry: Date.now() + 5 * 60 * 1e3 });
          resolve(result);
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
}
async function testOkxApi(creds) {
  const checks = [];
  let accountOk = false;
  try {
    const res = await okxRequest(creds, "GET", "/api/v5/account/balance");
    if (res.code !== "0") {
      let detail = `API\u9A8C\u8BC1\u5931\u8D25\uFF1A${res.msg}`;
      if (res.msg?.includes("50105") || res.code === "50105") detail = "Passphrase \u9519\u8BEF\uFF0C\u8BF7\u68C0\u67E5API\u53E3\u4EE4\u662F\u5426\u4E0EOKX\u8BBE\u7F6E\u4E00\u81F4";
      else if (res.msg?.includes("50111") || res.code === "50111") detail = "API Key \u65E0\u6548\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u751F\u6210";
      else if (res.msg?.includes("50113") || res.code === "50113") detail = "IP\u4E0D\u5728\u767D\u540D\u5355\uFF0C\u8BF7\u5728OKX\u5C06\u670D\u52A1\u5668IP\u52A0\u5165\u767D\u540D\u5355";
      else if (res.msg?.includes("50119") || res.code === "50119") detail = "API Key \u6743\u9650\u4E0D\u8DB3\uFF0C\u8BF7\u5F00\u542F\u5408\u7EA6\u4EA4\u6613\u6743\u9650";
      checks.push({ name: "API\u5BC6\u94A5\u4E0EPassphrase", passed: false, detail });
      return { success: false, message: detail, checks };
    }
    accountOk = true;
    checks.push({ name: "API\u5BC6\u94A5\u4E0EPassphrase", passed: true, detail: "API Key\u3001Secret\u3001Passphrase \u9A8C\u8BC1\u901A\u8FC7" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    let detail = `\u8FDE\u63A5\u5931\u8D25\uFF1A${msg}`;
    if (msg.includes("50105")) detail = "Passphrase \u9519\u8BEF\uFF0C\u8BF7\u68C0\u67E5API\u53E3\u4EE4\u662F\u5426\u4E0EOKX\u8BBE\u7F6E\u4E00\u81F4";
    else if (msg.includes("50111")) detail = "API Key \u65E0\u6548\u6216\u5DF2\u8FC7\u671F";
    else if (msg.includes("50113")) detail = "IP\u4E0D\u5728\u767D\u540D\u5355";
    checks.push({ name: "API\u5BC6\u94A5\u4E0EPassphrase", passed: false, detail });
    return { success: false, message: detail, checks };
  }
  if (accountOk) {
    try {
      const res = await okxRequest(creds, "GET", "/api/v5/account/config");
      if (res.code !== "0") {
        checks.push({ name: "\u6301\u4ED3\u6A21\u5F0F", passed: false, detail: `\u8D26\u6237\u914D\u7F6E\u67E5\u8BE2\u5931\u8D25\uFF1A${res.msg}` });
      } else {
        const posMode = res.data?.[0]?.posMode;
        if (posMode === "long_short_mode") {
          checks.push({ name: "\u6301\u4ED3\u6A21\u5F0F", passed: true, detail: "\u53CC\u5411\u6301\u4ED3\u6A21\u5F0F\uFF08\u4E70\u5356\u6A21\u5F0F\uFF09\uFF0C\u7B26\u5408\u8DDF\u5355\u8981\u6C42" });
        } else {
          checks.push({
            name: "\u6301\u4ED3\u6A21\u5F0F",
            passed: false,
            detail: "\u5F53\u524D\u4E3A\u5355\u5411\u6301\u4ED3\u6A21\u5F0F\uFF0C\u8BF7\u5728OKX\u5408\u7EA6\u9875\u9762 \u2192 \u8BBE\u7F6E \u2192 \u6301\u4ED3\u6A21\u5F0F\uFF0C\u5207\u6362\u4E3A\u300C\u53CC\u5411\u6301\u4ED3\u300D\u540E\u91CD\u65B0\u6D4B\u8BD5"
          });
        }
      }
    } catch {
      checks.push({ name: "\u6301\u4ED3\u6A21\u5F0F", passed: false, detail: "\u6301\u4ED3\u6A21\u5F0F\u67E5\u8BE2\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u5F00\u901A\u5408\u7EA6\u8D26\u6237" });
    }
  }
  const allPassed = checks.every((c) => c.passed);
  const failedChecks = checks.filter((c) => !c.passed);
  if (allPassed) {
    return { success: true, message: "\u8FDE\u63A5\u6210\u529F\uFF0C\u6240\u6709\u68C0\u6D4B\u9879\u901A\u8FC7", checks };
  } else {
    const summary = failedChecks.map((c) => c.detail).join("\uFF1B");
    return { success: false, message: summary, checks };
  }
}

// server/routers/exchange.ts
var exchangeRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const apis = await getExchangeApisByUserId(ctx.user.id);
    return apis.map((api) => ({
      ...api,
      apiKeyEncrypted: maskApiKey(api.apiKeyEncrypted),
      secretKeyEncrypted: "****",
      passphraseEncrypted: api.passphraseEncrypted ? "****" : null
    }));
  }),
  bind: protectedProcedure.input(z3.object({
    exchange: z3.enum(["binance", "okx", "bybit", "bitget", "gate"]),
    label: z3.string().optional(),
    apiKey: z3.string().min(1),
    secretKey: z3.string().min(1),
    passphrase: z3.string().optional()
  })).mutation(async ({ input, ctx }) => {
    await createExchangeApi({
      userId: ctx.user.id,
      exchange: input.exchange,
      label: input.label,
      apiKeyEncrypted: encrypt(input.apiKey),
      secretKeyEncrypted: encrypt(input.secretKey),
      passphraseEncrypted: input.passphrase ? encrypt(input.passphrase) : void 0
    });
    return { success: true };
  }),
  update: protectedProcedure.input(z3.object({
    id: z3.number(),
    label: z3.string().optional(),
    apiKey: z3.string().optional(),
    secretKey: z3.string().optional(),
    passphrase: z3.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const api = await getExchangeApiById(input.id);
    if (!api || api.userId !== ctx.user.id) throw new TRPCError3({ code: "NOT_FOUND" });
    const updateData = {};
    if (input.label !== void 0) updateData.label = input.label;
    if (input.apiKey) updateData.apiKeyEncrypted = encrypt(input.apiKey);
    if (input.secretKey) updateData.secretKeyEncrypted = encrypt(input.secretKey);
    if (input.passphrase) updateData.passphraseEncrypted = encrypt(input.passphrase);
    await updateExchangeApi(input.id, updateData);
    return { success: true };
  }),
  delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input, ctx }) => {
    const api = await getExchangeApiById(input.id);
    if (!api || api.userId !== ctx.user.id) throw new TRPCError3({ code: "NOT_FOUND" });
    await disableStrategiesByExchangeApiId(input.id);
    await deleteExchangeApi(input.id);
    return { success: true };
  }),
  test: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input, ctx }) => {
    const api = await getExchangeApiById(input.id);
    if (!api || api.userId !== ctx.user.id) throw new TRPCError3({ code: "NOT_FOUND" });
    try {
      const apiKey = decrypt(api.apiKeyEncrypted);
      const secretKey = decrypt(api.secretKeyEncrypted);
      const passphrase = api.passphraseEncrypted ? decrypt(api.passphraseEncrypted) : "";
      const exchange = (api.exchange || "binance").toLowerCase();
      let result;
      if (exchange === "binance") {
        result = await testBinanceApi({ apiKey, secretKey });
      } else if (exchange === "okx") {
        result = await testOkxApi({ apiKey, secretKey, passphrase });
      } else {
        result = {
          success: apiKey.length > 0 && secretKey.length > 0,
          message: apiKey.length > 0 ? "API\u5BC6\u94A5\u683C\u5F0F\u6B63\u786E\uFF08\u5B8C\u6574\u8FDE\u63A5\u6D4B\u8BD5\u6682\u4E0D\u652F\u6301\u8BE5\u4EA4\u6613\u6240\uFF09" : "API\u5BC6\u94A5\u4E0D\u80FD\u4E3A\u7A7A",
          checks: [{ name: "API\u5BC6\u94A5\u683C\u5F0F", passed: apiKey.length > 0, detail: apiKey.length > 0 ? "\u5BC6\u94A5\u975E\u7A7A" : "\u5BC6\u94A5\u4E3A\u7A7A" }]
        };
      }
      const detailLines = result.checks.map((c) => `${c.passed ? "\u2713" : "\u2717"} ${c.name}\uFF1A${c.detail}`).join("\n");
      const testMessage = result.success ? `\u8FDE\u63A5\u6210\u529F
${detailLines}` : `${result.message}`;
      await updateExchangeApi(input.id, {
        isVerified: result.success,
        lastTestedAt: /* @__PURE__ */ new Date(),
        testStatus: result.success ? "success" : "failed",
        testMessage
      });
      return { success: result.success, message: testMessage, checks: result.checks };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "\u8FDE\u63A5\u6D4B\u8BD5\u5F02\u5E38";
      await updateExchangeApi(input.id, {
        isVerified: false,
        lastTestedAt: /* @__PURE__ */ new Date(),
        testStatus: "failed",
        testMessage: msg
      });
      return { success: false, message: msg, checks: [] };
    }
  }),
  toggle: protectedProcedure.input(z3.object({ id: z3.number(), isActive: z3.boolean() })).mutation(async ({ input, ctx }) => {
    const api = await getExchangeApiById(input.id);
    if (!api || api.userId !== ctx.user.id) throw new TRPCError3({ code: "NOT_FOUND" });
    await updateExchangeApi(input.id, { isActive: input.isActive });
    return { success: true };
  })
});

// server/routers/funds.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z4 } from "zod";

// server/bsc-wallet.ts
init_crypto();
import { ethers } from "ethers";
import { eq as eq2, sql as sql2 } from "drizzle-orm";
var BSC_RPC_URL = "https://bsc-dataseed1.binance.org";
var BSC_RPC_FALLBACKS = [
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed1.defibit.io"
];
var BSC_CHAIN_ID = 56;
var USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";
var ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];
var BSCSCAN_API = "https://api.bscscan.com/api";
var SCAN_INTERVAL = 3 * 60 * 1e3;
var autoScanTimer = null;
async function getProviderWithFallback() {
  const urls = [BSC_RPC_URL, ...BSC_RPC_FALLBACKS];
  for (const url of urls) {
    try {
      const provider = new ethers.JsonRpcProvider(url, BSC_CHAIN_ID);
      await provider.getBlockNumber();
      return provider;
    } catch {
      continue;
    }
  }
  return new ethers.JsonRpcProvider(BSC_RPC_URL, BSC_CHAIN_ID);
}
async function initHDWallet() {
  const existing = await getSystemConfig("hd_mnemonic_encrypted");
  if (existing) {
    const mnemonic2 = decrypt(existing);
    const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic2, void 0, "m/44'/60'/0'/0");
    const mainWallet = hdNode.deriveChild(0);
    return { mnemonic: mnemonic2, mainAddress: mainWallet.address };
  }
  const wallet = ethers.Wallet.createRandom();
  const mnemonic = wallet.mnemonic.phrase;
  const encrypted = encrypt(mnemonic);
  await setSystemConfig("hd_mnemonic_encrypted", encrypted);
  await setSystemConfig("hd_next_index", "1");
  await setSystemConfig("main_wallet_address", wallet.address);
  return { mnemonic, mainAddress: wallet.address };
}
async function importHDWallet(mnemonic) {
  if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic phrase");
  }
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, void 0, "m/44'/60'/0'/0");
  const mainWallet = hdNode.deriveChild(0);
  const encrypted = encrypt(mnemonic);
  await setSystemConfig("hd_mnemonic_encrypted", encrypted);
  await setSystemConfig("hd_next_index", "1");
  await setSystemConfig("main_wallet_address", mainWallet.address);
  return { mainAddress: mainWallet.address };
}
async function deriveDepositAddress(userId) {
  const mnemonicEncrypted = await getSystemConfig("hd_mnemonic_encrypted");
  if (!mnemonicEncrypted) throw new Error("HD wallet not initialized");
  const mnemonic = decrypt(mnemonicEncrypted);
  const nextIndexStr = await getSystemConfig("hd_next_index") ?? "1";
  const nextIndex = parseInt(nextIndexStr, 10);
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, void 0, "m/44'/60'/0'/0");
  const childWallet = hdNode.deriveChild(nextIndex);
  await setSystemConfig(`deposit_addr_${userId}`, JSON.stringify({
    address: childWallet.address,
    index: nextIndex
  }));
  await setSystemConfig("hd_next_index", (nextIndex + 1).toString());
  return { address: childWallet.address, index: nextIndex };
}
async function getUserDepositAddress(userId) {
  const data = await getSystemConfig(`deposit_addr_${userId}`);
  if (data) {
    return JSON.parse(data);
  }
  return null;
}
async function getOrCreateDepositAddress(userId) {
  const existing = await getUserDepositAddress(userId);
  if (existing) return existing;
  return deriveDepositAddress(userId);
}
async function getPrivateKeyForIndex(index) {
  const mnemonicEncrypted = await getSystemConfig("hd_mnemonic_encrypted");
  if (!mnemonicEncrypted) throw new Error("HD wallet not initialized");
  const mnemonic = decrypt(mnemonicEncrypted);
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, void 0, "m/44'/60'/0'/0");
  return hdNode.deriveChild(index).privateKey;
}
async function getMainWalletPrivateKey() {
  return getPrivateKeyForIndex(0);
}
async function getUSDTBalance(address) {
  try {
    const provider = await getProviderWithFallback();
    const contract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, provider);
    const balance = await contract.balanceOf(address);
    return ethers.formatUnits(balance, 18);
  } catch (error) {
    console.error(`[BSC] Failed to get USDT balance for ${address}:`, error);
    return "0";
  }
}
async function getBNBBalance(address) {
  try {
    const provider = await getProviderWithFallback();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error(`[BSC] Failed to get BNB balance for ${address}:`, error);
    return "0";
  }
}
async function fetchUSDTTransfers(address, startBlock = 0, apiKey) {
  try {
    const key = apiKey || await getSystemConfig("bscscan_api_key") || "";
    const url = `${BSCSCAN_API}?module=account&action=tokentx&contractaddress=${USDT_CONTRACT}&address=${address}&startblock=${startBlock}&endblock=99999999&sort=asc&apikey=${key}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15e3);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await response.json();
    if (data.status !== "1" || !Array.isArray(data.result)) {
      console.log(`[BSCScan] No results for ${address}: ${data.message || "unknown"}`);
      return [];
    }
    return data.result.filter((tx) => tx.to.toLowerCase() === address.toLowerCase()).map((tx) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatUnits(tx.value, parseInt(tx.tokenDecimal || "18")),
      blockNumber: parseInt(tx.blockNumber),
      timeStamp: parseInt(tx.timeStamp)
    }));
  } catch (error) {
    console.error(`[BSCScan] Failed to fetch transfers for ${address}:`, error.message);
    return [];
  }
}
async function detectByBalanceChange(userId, address, db) {
  const snapshotKey = `balance_snapshot_${address.toLowerCase()}`;
  const lastSnapshotStr = await getSystemConfig(snapshotKey) ?? "0";
  const lastSnapshot = parseFloat(lastSnapshotStr);
  const currentBalanceStr = await getUSDTBalance(address);
  const currentBalance = parseFloat(currentBalanceStr);
  await setSystemConfig(snapshotKey, currentBalance.toFixed(8));
  const diff = currentBalance - lastSnapshot;
  if (diff < 0.01) {
    return { detected: false, amount: 0 };
  }
  return { detected: true, amount: diff };
}
async function isTxHashRecorded(db, txHash) {
  const existing = await db.select().from(deposits).where(eq2(deposits.txHash, txHash)).limit(1);
  return existing.length > 0;
}
async function creditDeposit(db, userId, amount, address, txHash, fromAddress, source) {
  if (txHash) {
    const exists = await isTxHashRecorded(db, txHash);
    if (exists) {
      console.log(`[Scan] Skipping duplicate txHash: ${txHash}`);
      return false;
    }
  }
  await db.insert(deposits).values({
    userId,
    amount: amount.toFixed(8),
    txHash: txHash || `rpc_${Date.now()}_${address.substring(0, 8)}`,
    fromAddress: fromAddress || "unknown",
    toAddress: address,
    proofNote: source,
    status: "approved",
    reviewedAt: /* @__PURE__ */ new Date()
  });
  const [user] = await db.select().from(users).where(eq2(users.id, userId)).limit(1);
  if (user) {
    const newBalance = parseFloat(user.balance || "0") + amount;
    await db.update(users).set({ balance: newBalance.toFixed(8) }).where(eq2(users.id, userId));
    await db.insert(fundTransactions).values({
      userId,
      type: "deposit",
      amount: amount.toFixed(8),
      balanceAfter: newBalance.toFixed(8),
      note: txHash ? `BSC\u94FE\u4E0A\u5145\u503C\u81EA\u52A8\u5230\u8D26 TxHash: ${txHash.substring(0, 16)}...` : `BSC\u94FE\u4E0A\u5145\u503C\u81EA\u52A8\u5230\u8D26\uFF08\u4F59\u989D\u68C0\u6D4B\uFF09`
    });
    console.log(`[Scan] Credited ${amount.toFixed(4)} USDT to user ${userId} via ${source}`);
    return true;
  }
  return false;
}
async function scanDeposits() {
  const db = await getDb();
  if (!db) return { detected: 0, credited: 0, errors: ["Database not available"], method: "none" };
  const mnemonicExists = await getSystemConfig("hd_mnemonic_encrypted");
  if (!mnemonicExists) return { detected: 0, credited: 0, errors: ["HD wallet not initialized"], method: "none" };
  const errors = [];
  let detected = 0;
  let credited = 0;
  let methodUsed = "none";
  try {
    const configs = await db.select().from(systemConfig).where(sql2`\`key\` LIKE 'deposit_addr_%'`);
    if (configs.length === 0) {
      return { detected: 0, credited: 0, errors: [], method: "no_addresses" };
    }
    const hasBscscanKey = !!await getSystemConfig("bscscan_api_key");
    for (const config of configs) {
      try {
        const userIdStr = config.key.replace("deposit_addr_", "");
        const userId = parseInt(userIdStr, 10);
        if (isNaN(userId)) continue;
        const addrData = JSON.parse(config.value);
        const address = addrData.address;
        let bscscanFound = false;
        try {
          const lastBlockKey = `last_block_${address.toLowerCase()}`;
          const lastBlockStr = await getSystemConfig(lastBlockKey) ?? "0";
          const lastBlock = parseInt(lastBlockStr, 10);
          const transfers = await fetchUSDTTransfers(address, lastBlock > 0 ? lastBlock + 1 : 0);
          if (transfers.length > 0) {
            methodUsed = hasBscscanKey ? "bscscan_api" : "bscscan_public";
            for (const tx of transfers) {
              const amount = parseFloat(tx.value);
              if (amount <= 0) continue;
              const didCredit = await creditDeposit(
                db,
                userId,
                amount,
                address,
                tx.hash,
                tx.from,
                "BSCScan API \u81EA\u52A8\u68C0\u6D4B"
              );
              if (didCredit) {
                detected++;
                credited++;
                bscscanFound = true;
              }
              if (tx.blockNumber > lastBlock) {
                await setSystemConfig(lastBlockKey, tx.blockNumber.toString());
              }
            }
          }
        } catch (bscscanErr) {
          console.error(`[Scan] BSCScan method failed for ${address}:`, bscscanErr.message);
        }
        if (!bscscanFound) {
          try {
            const { detected: balanceDetected, amount } = await detectByBalanceChange(userId, address, db);
            if (balanceDetected && amount > 0) {
              methodUsed = methodUsed === "none" ? "rpc_balance" : methodUsed + "+rpc_balance";
              const rpcTxId = `rpc_${Date.now()}_${address.substring(2, 10)}`;
              const didCredit = await creditDeposit(
                db,
                userId,
                amount,
                address,
                null,
                null,
                "RPC\u4F59\u989D\u53D8\u5316\u68C0\u6D4B"
              );
              if (didCredit) {
                detected++;
                credited++;
              }
            }
          } catch (rpcErr) {
            errors.push(`RPC balance check for user ${userId}: ${rpcErr.message}`);
          }
        } else {
          try {
            const currentBalance = await getUSDTBalance(address);
            const snapshotKey = `balance_snapshot_${address.toLowerCase()}`;
            await setSystemConfig(snapshotKey, parseFloat(currentBalance).toFixed(8));
          } catch {
          }
        }
      } catch (err) {
        errors.push(`User ${config.key}: ${err.message}`);
      }
    }
  } catch (err) {
    errors.push(`Scan error: ${err.message}`);
  }
  console.log(`[Scan] Complete: detected=${detected}, credited=${credited}, method=${methodUsed}, errors=${errors.length}`);
  return { detected, credited, errors, method: methodUsed };
}
async function sendGasToChild(childAddress, gasAmount = "0.001") {
  const mainPrivateKey = await getMainWalletPrivateKey();
  const provider = await getProviderWithFallback();
  const mainWallet = new ethers.Wallet(mainPrivateKey, provider);
  const tx = await mainWallet.sendTransaction({
    to: childAddress,
    value: ethers.parseEther(gasAmount)
  });
  await tx.wait();
  return tx.hash;
}
async function sweepUSDT(childIndex, childAddress, mainAddress) {
  const childPrivateKey = await getPrivateKeyForIndex(childIndex);
  const provider = await getProviderWithFallback();
  const childWallet = new ethers.Wallet(childPrivateKey, provider);
  const usdtContract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, childWallet);
  const balance = await usdtContract.balanceOf(childAddress);
  if (balance === BigInt(0)) return "";
  const tx = await usdtContract.transfer(mainAddress, balance);
  await tx.wait();
  return tx.hash;
}
async function collectDeposits() {
  const db = await getDb();
  if (!db) return { collected: 0, totalAmount: "0", errors: ["Database not available"] };
  const mainAddress = await getSystemConfig("main_wallet_address");
  if (!mainAddress) return { collected: 0, totalAmount: "0", errors: ["Main wallet not configured"] };
  const errors = [];
  let collected = 0;
  let totalAmount = 0;
  try {
    const configs = await db.select().from(systemConfig).where(sql2`\`key\` LIKE 'deposit_addr_%'`);
    for (const config of configs) {
      try {
        const addrData = JSON.parse(config.value);
        const address = addrData.address;
        const index = addrData.index;
        const balance = await getUSDTBalance(address);
        const balanceNum = parseFloat(balance);
        if (balanceNum < 1) continue;
        const bnbBalance = await getBNBBalance(address);
        if (parseFloat(bnbBalance) < 5e-4) {
          try {
            await sendGasToChild(address, "0.001");
            await new Promise((resolve) => setTimeout(resolve, 5e3));
          } catch (gasErr) {
            errors.push(`Gas send to ${address} failed: ${gasErr.message}`);
            continue;
          }
        }
        const txHash = await sweepUSDT(index, address, mainAddress);
        if (txHash) {
          collected++;
          totalAmount += balanceNum;
          console.log(`[BSC] Collected ${balance} USDT from ${address} -> ${mainAddress}, tx: ${txHash}`);
          const snapshotKey = `balance_snapshot_${address.toLowerCase()}`;
          await setSystemConfig(snapshotKey, "0");
        }
      } catch (err) {
        errors.push(`Collection from ${config.key}: ${err.message}`);
      }
    }
  } catch (err) {
    errors.push(`Collection error: ${err.message}`);
  }
  return { collected, totalAmount: totalAmount.toFixed(8), errors };
}
async function getWalletStatus() {
  const mainAddress = await getSystemConfig("main_wallet_address");
  const nextIndex = parseInt(await getSystemConfig("hd_next_index") ?? "0", 10);
  const mnemonicExists = !!await getSystemConfig("hd_mnemonic_encrypted");
  const lastScanTime = await getSystemConfig("last_scan_time");
  let mainUSDTBalance = "0";
  let mainBNBBalance = "0";
  let totalUserAddresses = 0;
  if (mainAddress) {
    mainUSDTBalance = await getUSDTBalance(mainAddress);
    mainBNBBalance = await getBNBBalance(mainAddress);
  }
  const db = await getDb();
  if (db) {
    const [result] = await db.select({ count: sql2`count(*)` }).from(systemConfig).where(sql2`\`key\` LIKE 'deposit_addr_%'`);
    totalUserAddresses = Number(result.count);
  }
  return {
    initialized: mnemonicExists,
    mainAddress: mainAddress ?? null,
    mainUSDTBalance,
    mainBNBBalance,
    totalUserAddresses,
    nextIndex,
    autoScanActive: autoScanTimer !== null,
    lastScanTime: lastScanTime ?? null
  };
}
function startAutoScan() {
  if (autoScanTimer) {
    console.log("[AutoScan] Already running, skipping start");
    return;
  }
  console.log(`[AutoScan] Starting automatic deposit scan every ${SCAN_INTERVAL / 1e3}s`);
  setTimeout(async () => {
    try {
      const mnemonicExists = await getSystemConfig("hd_mnemonic_encrypted");
      if (mnemonicExists) {
        console.log("[AutoScan] Running initial scan...");
        const result = await scanDeposits();
        await setSystemConfig("last_scan_time", (/* @__PURE__ */ new Date()).toISOString());
        console.log(`[AutoScan] Initial scan result: detected=${result.detected}, credited=${result.credited}, method=${result.method}`);
      } else {
        console.log("[AutoScan] HD wallet not initialized, skipping initial scan");
      }
    } catch (err) {
      console.error("[AutoScan] Initial scan error:", err.message);
    }
  }, 3e4);
  autoScanTimer = setInterval(async () => {
    try {
      const mnemonicExists = await getSystemConfig("hd_mnemonic_encrypted");
      if (!mnemonicExists) return;
      console.log("[AutoScan] Running scheduled scan...");
      const result = await scanDeposits();
      await setSystemConfig("last_scan_time", (/* @__PURE__ */ new Date()).toISOString());
      if (result.detected > 0) {
        console.log(`[AutoScan] Found ${result.detected} new deposits, credited ${result.credited}`);
      }
      if (result.errors.length > 0) {
        console.warn(`[AutoScan] Scan errors:`, result.errors);
      }
    } catch (err) {
      console.error("[AutoScan] Scheduled scan error:", err.message);
    }
  }, SCAN_INTERVAL);
}
function stopAutoScan() {
  if (autoScanTimer) {
    clearInterval(autoScanTimer);
    autoScanTimer = null;
    console.log("[AutoScan] Stopped");
  }
}

// server/routers/funds.ts
var fundsRouter = router({
  myBalance: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    return { balance: user?.balance ?? "0" };
  }),
  // Each user gets their own unique deposit address
  depositAddress: protectedProcedure.query(async ({ ctx }) => {
    try {
      const walletStatus = await getWalletStatus();
      if (!walletStatus.initialized) {
        return {
          address: null,
          network: "BSC (BEP-20)",
          token: "USDT",
          message: "\u5145\u503C\u7CFB\u7EDF\u6B63\u5728\u521D\u59CB\u5316\u4E2D\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5"
        };
      }
      const addrData = await getOrCreateDepositAddress(ctx.user.id);
      return {
        address: addrData.address,
        network: "BSC (BEP-20)",
        token: "USDT",
        message: "\u8BF7\u5411\u6B64\u5730\u5740\u8F6C\u5165 USDT (BEP-20)\uFF0C\u7CFB\u7EDF\u5C06\u81EA\u52A8\u68C0\u6D4B\u5230\u8D26"
      };
    } catch (error) {
      console.error("[Funds] Failed to get deposit address:", error);
      return {
        address: null,
        network: "BSC (BEP-20)",
        token: "USDT",
        message: "\u83B7\u53D6\u5145\u503C\u5730\u5740\u5931\u8D25\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458"
      };
    }
  }),
  // User can still manually submit deposit proof (for cases where auto-detection fails)
  submitDeposit: protectedProcedure.input(z4.object({
    amount: z4.number().positive(),
    txHash: z4.string().optional(),
    fromAddress: z4.string().optional(),
    proofNote: z4.string().optional()
  })).mutation(async ({ input, ctx }) => {
    let toAddress = "";
    try {
      const addrData = await getOrCreateDepositAddress(ctx.user.id);
      toAddress = addrData.address;
    } catch {
    }
    await createDeposit({
      userId: ctx.user.id,
      amount: input.amount.toFixed(8),
      txHash: input.txHash,
      fromAddress: input.fromAddress,
      toAddress,
      proofNote: input.proofNote || "\u7528\u6237\u624B\u52A8\u63D0\u4EA4"
    });
    return { success: true };
  }),
  submitWithdrawal: protectedProcedure.input(z4.object({
    amount: z4.number().positive(),
    toAddress: z4.string().min(10)
  })).mutation(async ({ input, ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError4({ code: "NOT_FOUND" });
    const minAmount = parseFloat(await getSystemConfig("withdrawal_min_amount") ?? "10");
    if (input.amount < minAmount) throw new TRPCError4({ code: "BAD_REQUEST", message: `\u6700\u4F4E\u63D0\u73B0\u91D1\u989D\u4E3A ${minAmount} USDT` });
    const feeRate = parseFloat(await getSystemConfig("withdrawal_fee_rate") ?? "0.01");
    const fee = input.amount * feeRate;
    const netAmount = input.amount - fee;
    const balance = parseFloat(user.balance || "0");
    if (balance < input.amount) throw new TRPCError4({ code: "BAD_REQUEST", message: "\u4F59\u989D\u4E0D\u8DB3" });
    const newBalance = balance - input.amount;
    await updateUser(ctx.user.id, { balance: newBalance.toFixed(8) });
    await createWithdrawal({
      userId: ctx.user.id,
      amount: input.amount.toFixed(8),
      fee: fee.toFixed(8),
      netAmount: netAmount.toFixed(8),
      toAddress: input.toAddress,
      network: "BSC"
    });
    await addFundTransaction({
      userId: ctx.user.id,
      type: "withdrawal",
      amount: (-input.amount).toFixed(8),
      balanceAfter: newBalance.toFixed(8),
      note: `\u63D0\u73B0\u7533\u8BF7 ${input.amount} USDT`
    });
    return { success: true };
  }),
  myDeposits: protectedProcedure.input(z4.object({ page: z4.number().default(1), limit: z4.number().default(20) })).query(async ({ input, ctx }) => {
    return listDeposits(ctx.user.id, input.page, input.limit);
  }),
  myWithdrawals: protectedProcedure.input(z4.object({ page: z4.number().default(1), limit: z4.number().default(20) })).query(async ({ input, ctx }) => {
    return listWithdrawals(ctx.user.id, input.page, input.limit);
  }),
  myTransactions: protectedProcedure.input(z4.object({ page: z4.number().default(1), limit: z4.number().default(20) })).query(async ({ input, ctx }) => {
    return listFundTransactions(ctx.user.id, input.page, input.limit);
  }),
  // ─── Admin ─────────────────────────────────────────────────────────────────
  adminDeposits: adminProcedure.input(z4.object({ page: z4.number().default(1), limit: z4.number().default(20) })).query(async ({ input }) => {
    return listDeposits(void 0, input.page, input.limit);
  }),
  adminWithdrawals: adminProcedure.input(z4.object({ page: z4.number().default(1), limit: z4.number().default(20) })).query(async ({ input }) => {
    return listWithdrawals(void 0, input.page, input.limit);
  }),
  adminAllTransactions: adminProcedure.input(z4.object({ page: z4.number().default(1), limit: z4.number().default(20) })).query(async ({ input }) => {
    return listFundTransactions(void 0, input.page, input.limit);
  }),
  adminReviewDeposit: adminProcedure.input(z4.object({
    depositId: z4.number(),
    approved: z4.boolean(),
    reviewNote: z4.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const deposit = (await listDeposits(void 0, 1, 1e4)).items.find((d) => d.id === input.depositId);
    if (!deposit) throw new TRPCError4({ code: "NOT_FOUND" });
    if (deposit.status !== "pending") throw new TRPCError4({ code: "BAD_REQUEST", message: "\u8BE5\u7533\u8BF7\u5DF2\u5904\u7406" });
    await updateDeposit(input.depositId, {
      status: input.approved ? "approved" : "rejected",
      reviewedBy: ctx.user.id,
      reviewNote: input.reviewNote,
      reviewedAt: /* @__PURE__ */ new Date()
    });
    if (input.approved) {
      const user = await getUserById(deposit.userId);
      if (user) {
        const newBalance = parseFloat(user.balance || "0") + parseFloat(deposit.amount);
        await updateUser(deposit.userId, { balance: newBalance.toFixed(8) });
        await addFundTransaction({
          userId: deposit.userId,
          type: "deposit",
          amount: deposit.amount,
          balanceAfter: newBalance.toFixed(8),
          relatedId: deposit.id,
          note: `\u5145\u503C\u5BA1\u6838\u901A\u8FC7`
        });
      }
    }
    return { success: true };
  }),
  adminReviewWithdrawal: adminProcedure.input(z4.object({
    withdrawalId: z4.number(),
    approved: z4.boolean(),
    txHash: z4.string().optional(),
    reviewNote: z4.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const withdrawal = (await listWithdrawals(void 0, 1, 1e4)).items.find((w) => w.id === input.withdrawalId);
    if (!withdrawal) throw new TRPCError4({ code: "NOT_FOUND" });
    if (withdrawal.status !== "pending") throw new TRPCError4({ code: "BAD_REQUEST", message: "\u8BE5\u7533\u8BF7\u5DF2\u5904\u7406" });
    if (input.approved) {
      await updateWithdrawal(input.withdrawalId, {
        status: "completed",
        txHash: input.txHash,
        reviewedBy: ctx.user.id,
        reviewNote: input.reviewNote,
        reviewedAt: /* @__PURE__ */ new Date()
      });
      const user = await getUserById(withdrawal.userId);
      if (user) {
        await addFundTransaction({
          userId: withdrawal.userId,
          type: "withdrawal",
          amount: "0",
          balanceAfter: user.balance || "0",
          relatedId: withdrawal.id,
          note: `\u63D0\u73B0\u5BA1\u6838\u901A\u8FC7\uFF0C\u5DF2\u6253\u6B3E ${withdrawal.netAmount} USDT${input.txHash ? ` (TxHash: ${input.txHash})` : ""}`
        });
      }
    } else {
      const user = await getUserById(withdrawal.userId);
      if (user) {
        const refund = parseFloat(withdrawal.amount);
        const newBalance = parseFloat(user.balance || "0") + refund;
        await updateUser(withdrawal.userId, { balance: newBalance.toFixed(8) });
        await addFundTransaction({
          userId: withdrawal.userId,
          type: "deposit",
          amount: withdrawal.amount,
          balanceAfter: newBalance.toFixed(8),
          relatedId: withdrawal.id,
          note: `\u63D0\u73B0\u7533\u8BF7\u88AB\u62D2\u7EDD\uFF0C\u9000\u6B3E`
        });
      }
      await updateWithdrawal(input.withdrawalId, {
        status: "rejected",
        reviewedBy: ctx.user.id,
        reviewNote: input.reviewNote,
        reviewedAt: /* @__PURE__ */ new Date()
      });
    }
    return { success: true };
  }),
  // ─── Admin: System Config ──────────────────────────────────────────────────
  adminGetConfig: adminProcedure.query(async () => {
    return listSystemConfig();
  }),
  adminSetConfig: adminProcedure.input(z4.object({ key: z4.string(), value: z4.string() })).mutation(async ({ input }) => {
    await setSystemConfig(input.key, input.value);
    return { success: true };
  }),
  // ─── Admin: BSC Wallet Management ──────────────────────────────────────────
  adminWalletStatus: adminProcedure.query(async () => {
    return getWalletStatus();
  }),
  adminInitWallet: adminProcedure.mutation(async () => {
    const result = await initHDWallet();
    return { success: true, mainAddress: result.mainAddress, mnemonic: result.mnemonic };
  }),
  adminExportMnemonic: adminProcedure.mutation(async () => {
    const mnemonicEncrypted = await getSystemConfig("hd_mnemonic_encrypted");
    if (!mnemonicEncrypted) throw new TRPCError4({ code: "NOT_FOUND", message: "HD\u94B1\u5305\u5C1A\u672A\u521D\u59CB\u5316" });
    const { decrypt: decrypt2 } = await Promise.resolve().then(() => (init_crypto(), crypto_exports));
    const mnemonic = decrypt2(mnemonicEncrypted);
    const { ethers: ethers2 } = await import("ethers");
    const hdNode = ethers2.HDNodeWallet.fromPhrase(mnemonic, void 0, "m/44'/60'/0'/0");
    const mainWallet = hdNode.deriveChild(0);
    return { mnemonic, privateKey: mainWallet.privateKey, address: mainWallet.address };
  }),
  adminImportWallet: adminProcedure.input(z4.object({ mnemonic: z4.string().min(10) })).mutation(async ({ input }) => {
    const result = await importHDWallet(input.mnemonic);
    return { success: true, mainAddress: result.mainAddress };
  }),
  adminSetBscscanKey: adminProcedure.input(z4.object({ apiKey: z4.string().min(1) })).mutation(async ({ input }) => {
    await setSystemConfig("bscscan_api_key", input.apiKey);
    return { success: true };
  }),
  adminScanDeposits: adminProcedure.mutation(async () => {
    const result = await scanDeposits();
    return result;
  }),
  adminCollectDeposits: adminProcedure.mutation(async () => {
    const result = await collectDeposits();
    return result;
  }),
  adminCheckAddressBalance: adminProcedure.input(z4.object({ address: z4.string().min(10) })).query(async ({ input }) => {
    const usdtBalance = await getUSDTBalance(input.address);
    const bnbBalance = await getBNBBalance(input.address);
    return { usdtBalance, bnbBalance };
  }),
  adminToggleAutoScan: adminProcedure.input(z4.object({ enabled: z4.boolean() })).mutation(async ({ input }) => {
    if (input.enabled) {
      startAutoScan();
    } else {
      stopAutoScan();
    }
    return { success: true, autoScanActive: input.enabled };
  }),
  // Admin: manually adjust user balance
  adminAdjustBalance: adminProcedure.input(z4.object({
    userId: z4.number(),
    amount: z4.number().refine((v) => v !== 0, { message: "\u8C03\u6574\u91D1\u989D\u4E0D\u80FD\u4E3A0" }),
    note: z4.string().min(1, "\u8BF7\u586B\u5199\u64CD\u4F5C\u5907\u6CE8")
  })).mutation(async ({ input, ctx }) => {
    const user = await getUserById(input.userId);
    if (!user) throw new TRPCError4({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
    const currentBalance = parseFloat(user.balance || "0");
    const newBalance = currentBalance + input.amount;
    if (newBalance < 0) throw new TRPCError4({ code: "BAD_REQUEST", message: `\u4F59\u989D\u4E0D\u8DB3\uFF0C\u5F53\u524D\u4F59\u989D ${currentBalance.toFixed(2)} USDT\uFF0C\u65E0\u6CD5\u6263\u51CF ${Math.abs(input.amount).toFixed(2)} USDT` });
    await updateUser(input.userId, { balance: newBalance.toFixed(8) });
    await addFundTransaction({
      userId: input.userId,
      type: "admin_adjust",
      amount: input.amount.toFixed(8),
      balanceAfter: newBalance.toFixed(8),
      note: `\u7BA1\u7406\u5458\u8C03\u6574 [${ctx.user.id}]: ${input.note}`
    });
    return { success: true, newBalance: newBalance.toFixed(8) };
  })
});

// server/routers/points.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z as z5 } from "zod";
var MS_30_DAYS = 30 * 24 * 60 * 60 * 1e3;
var pointsRouter = router({
  myBalance: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    return { points: user?.points ?? 0 };
  }),
  myTransactions: protectedProcedure.input(z5.object({ page: z5.number().default(1), limit: z5.number().default(20) })).query(async ({ input, ctx }) => {
    return listPointsTransactions(ctx.user.id, input.page, input.limit);
  }),
  redeem: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError5({ code: "NOT_FOUND" });
    const stats = await getUserOrderStats(ctx.user.id);
    const netPnl = stats.netPnl;
    if (netPnl >= 0) throw new TRPCError5({ code: "BAD_REQUEST", message: "\u5F53\u524D\u65E0\u51C0\u4E8F\u635F\uFF0C\u65E0\u6CD5\u5151\u6362\u79EF\u5206" });
    if (user.lastPointsRedeemMonth) {
      const lastRedeemTime = new Date(user.lastPointsRedeemMonth).getTime();
      const now2 = Date.now();
      const diffMs = now2 - lastRedeemTime;
      if (diffMs < MS_30_DAYS) {
        const daysLeft = Math.ceil((MS_30_DAYS - diffMs) / (24 * 60 * 60 * 1e3));
        throw new TRPCError5({ code: "BAD_REQUEST", message: `\u8DDD\u4E0A\u6B21\u5151\u6362\u4E0D\u8DB330\u5929\uFF0C\u8FD8\u9700\u7B49\u5F85 ${daysLeft} \u5929` });
      }
    }
    const redeemAmount = Math.floor(Math.abs(netPnl));
    if (redeemAmount <= 0) throw new TRPCError5({ code: "BAD_REQUEST", message: "\u53EF\u5151\u6362\u79EF\u5206\u6570\u91CF\u4E0D\u8DB3" });
    const now = /* @__PURE__ */ new Date();
    const nowIso = now.toISOString();
    const newPoints = (user.points ?? 0) + redeemAmount;
    await updateUser(ctx.user.id, {
      points: newPoints,
      lastPointsRedeemMonth: nowIso,
      // store full ISO timestamp for 30-day check
      totalLoss: "0",
      totalProfit: "0"
    });
    await addPointsTransaction({
      userId: ctx.user.id,
      type: "redeem",
      amount: redeemAmount,
      balanceAfter: newPoints,
      redeemMonth: nowIso.slice(0, 7),
      note: `\u51C0\u4E8F\u635F\u5151\u6362\u79EF\u5206 ${redeemAmount} \u79EF\u5206`
    });
    return { success: true, pointsAdded: redeemAmount, newBalance: newPoints };
  }),
  // Transfer by invite code (more user-friendly than numeric userId)
  transfer: protectedProcedure.input(z5.object({
    toInviteCode: z5.string().min(1),
    amount: z5.number().int().positive()
  })).mutation(async ({ input, ctx }) => {
    const sender = await getUserById(ctx.user.id);
    if (!sender) throw new TRPCError5({ code: "NOT_FOUND" });
    const receiver = await getUserByInviteCode(input.toInviteCode.trim());
    if (!receiver) throw new TRPCError5({ code: "NOT_FOUND", message: "\u672A\u627E\u5230\u8BE5\u9080\u8BF7\u7801\u5BF9\u5E94\u7684\u7528\u6237" });
    if (receiver.id === ctx.user.id) throw new TRPCError5({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u8F6C\u7ED9\u81EA\u5DF1" });
    if ((sender.points ?? 0) < input.amount) throw new TRPCError5({ code: "BAD_REQUEST", message: "\u79EF\u5206\u4F59\u989D\u4E0D\u8DB3" });
    const senderNew = (sender.points ?? 0) - input.amount;
    const receiverNew = (receiver.points ?? 0) + input.amount;
    await updateUser(ctx.user.id, { points: senderNew });
    await updateUser(receiver.id, { points: receiverNew });
    await addPointsTransaction({
      userId: ctx.user.id,
      type: "transfer_out",
      amount: -input.amount,
      balanceAfter: senderNew,
      relatedUserId: receiver.id,
      note: `\u8F6C\u51FA\u79EF\u5206\u7ED9 ${receiver.name || receiver.email}\uFF08\u9080\u8BF7\u7801 ${input.toInviteCode}\uFF09`
    });
    await addPointsTransaction({
      userId: receiver.id,
      type: "transfer_in",
      amount: input.amount,
      balanceAfter: receiverNew,
      relatedUserId: ctx.user.id,
      note: `\u6536\u5230\u6765\u81EA ${sender.name || sender.email} \u7684\u79EF\u5206`
    });
    return { success: true, receiverName: receiver.name || receiver.email };
  }),
  adminAdjust: adminProcedure.input(z5.object({
    userId: z5.number(),
    amount: z5.number().int(),
    note: z5.string().optional()
  })).mutation(async ({ input }) => {
    const user = await getUserById(input.userId);
    if (!user) throw new TRPCError5({ code: "NOT_FOUND" });
    const newPoints = Math.max(0, (user.points ?? 0) + input.amount);
    await updateUser(input.userId, { points: newPoints });
    await addPointsTransaction({
      userId: input.userId,
      type: input.amount > 0 ? "admin_add" : "admin_deduct",
      amount: input.amount,
      balanceAfter: newPoints,
      note: input.note ?? (input.amount > 0 ? "\u7BA1\u7406\u5458\u589E\u52A0\u79EF\u5206" : "\u7BA1\u7406\u5458\u6263\u51CF\u79EF\u5206")
    });
    return { success: true, newBalance: newPoints };
  }),
  adminAllTransactions: adminProcedure.input(z5.object({ page: z5.number().default(1), limit: z5.number().default(20) })).query(async ({ input }) => {
    return listAllPointsTransactions(input.page, input.limit);
  })
});

// server/routers/strategy.ts
import { TRPCError as TRPCError6 } from "@trpc/server";
import { z as z6 } from "zod";

// server/revenue-share.ts
async function processRevenueShare(params) {
  const { copyOrderId, traderId, netPnl } = params;
  if (netPnl <= 0) return;
  const trader = await getUserById(traderId);
  if (!trader) return;
  const traderRatio = parseFloat(trader.revenueShareRatio || "0");
  if (traderRatio <= 0) return;
  const totalDeducted = netPnl * (traderRatio / 100);
  if (totalDeducted <= 0) return;
  let chain = await getUserReferralChain(traderId);
  if (chain.length === 0) {
    const admin = await getAdminUser();
    if (!admin || admin.id === traderId) {
      const updatedTrader2 = await getUserById(traderId);
      if (updatedTrader2) {
        const newBalance = Math.max(0, parseFloat(updatedTrader2.balance || "0") - totalDeducted);
        await updateUser(traderId, { balance: newBalance.toFixed(8) });
        await addFundTransaction({
          userId: traderId,
          type: "revenue_share_out",
          amount: (-totalDeducted).toFixed(8),
          balanceAfter: newBalance.toFixed(8),
          relatedId: copyOrderId,
          note: `\u6536\u76CA\u5206\u6210\u6263\u51CF\uFF08\u5F52\u5E73\u53F0\uFF09`
        });
        await updateCopyOrder(copyOrderId, { revenueShareDeducted: totalDeducted.toFixed(8) });
      }
      return;
    }
    chain = [{ id: admin.id, revenueShareRatio: admin.revenueShareRatio }];
  }
  const records = [];
  let childRatio = traderRatio;
  for (let i = 0; i < chain.length; i++) {
    const ancestor = chain[i];
    const ownRatio = parseFloat(ancestor.revenueShareRatio || "0");
    const diff = childRatio - ownRatio;
    if (diff > 0) {
      const amount = netPnl * (diff / 100);
      if (amount > 0) {
        records.push({
          copyOrderId,
          traderId,
          recipientId: ancestor.id,
          level: i + 1,
          traderPnl: netPnl.toFixed(8),
          ratio: diff.toFixed(2),
          amount: amount.toFixed(8)
        });
        const recipient = await getUserById(ancestor.id);
        if (recipient) {
          const newBalance = parseFloat(recipient.balance || "0") + amount;
          await updateUser(ancestor.id, { balance: newBalance.toFixed(8) });
          await addFundTransaction({
            userId: ancestor.id,
            type: "revenue_share_in",
            amount: amount.toFixed(8),
            balanceAfter: newBalance.toFixed(8),
            relatedId: copyOrderId,
            note: `\u6765\u81EA\u7528\u6237 #${traderId} \u7684\u6536\u76CA\u5206\u6210`
          });
        }
      }
    }
    childRatio = ownRatio;
    if (childRatio <= 0) break;
  }
  if (records.length > 0) {
    await createRevenueShareRecords(records);
  }
  const updatedTrader = await getUserById(traderId);
  if (updatedTrader) {
    const newBalance = Math.max(0, parseFloat(updatedTrader.balance || "0") - totalDeducted);
    await updateUser(traderId, { balance: newBalance.toFixed(8) });
    await addFundTransaction({
      userId: traderId,
      type: "revenue_share_out",
      amount: (-totalDeducted).toFixed(8),
      balanceAfter: newBalance.toFixed(8),
      relatedId: copyOrderId,
      note: `\u6536\u76CA\u5206\u6210\u6263\u51CF`
    });
    await updateCopyOrder(copyOrderId, { revenueShareDeducted: totalDeducted.toFixed(8) });
  }
}

// server/routers/strategy.ts
init_crypto();

// server/copy-engine.ts
import WebSocket from "ws";
import crypto7 from "crypto";
import http from "http";
import https2 from "https";
init_crypto();

// server/bybit-client.ts
import crypto4 from "crypto";
var BASE_URL2 = "https://api.bybit.com";
var RECV_WINDOW = "5000";
function sign3(apiKey, secretKey, timestamp2, payload) {
  const msg = timestamp2 + apiKey + RECV_WINDOW + payload;
  return crypto4.createHmac("sha256", secretKey).update(msg).digest("hex");
}
async function bybitRequest(creds, method, path2, params = {}) {
  const timestamp2 = Date.now().toString();
  let url = `${BASE_URL2}${path2}`;
  let body = "";
  let signPayload = "";
  if (method === "GET") {
    const qs = new URLSearchParams(params).toString();
    signPayload = qs;
    if (qs) url += `?${qs}`;
  } else {
    body = JSON.stringify(params);
    signPayload = body;
  }
  const signature = sign3(creds.apiKey, creds.secretKey, timestamp2, signPayload);
  const res = await fetch(url, {
    method,
    headers: {
      "X-BAPI-API-KEY": creds.apiKey,
      "X-BAPI-SIGN": signature,
      "X-BAPI-TIMESTAMP": timestamp2,
      "X-BAPI-RECV-WINDOW": RECV_WINDOW,
      "Content-Type": "application/json"
    },
    body: method === "POST" ? body : void 0
  });
  const data = await res.json();
  if (data.retCode !== 0) {
    throw new Error(`Bybit API error ${data.retCode}: ${data.retMsg}`);
  }
  return data.result;
}
function toBybitSymbol(instId) {
  const parts = instId.split("-");
  return parts.length >= 2 ? parts[0] + parts[1] : instId.replace(/-/g, "");
}
async function placeBybitOrder(creds, instId, side, positionSide, quantity) {
  const symbol = toBybitSymbol(instId);
  const positionIdx = positionSide === "LONG" ? 1 : 2;
  return bybitRequest(creds, "POST", "/v5/order/create", {
    category: "linear",
    symbol,
    side,
    orderType: "Market",
    qty: quantity,
    positionIdx
  });
}
async function closeBybitPosition(creds, instId, positionSide, quantity) {
  const side = positionSide === "LONG" ? "Sell" : "Buy";
  const symbol = toBybitSymbol(instId);
  const positionIdx = positionSide === "LONG" ? 1 : 2;
  return bybitRequest(creds, "POST", "/v5/order/create", {
    category: "linear",
    symbol,
    side,
    orderType: "Market",
    qty: quantity,
    positionIdx,
    reduceOnly: true
  });
}
async function getBybitOrderDetail(creds, symbol, orderId) {
  let order;
  try {
    const data = await bybitRequest(
      creds,
      "GET",
      "/v5/order/realtime",
      { category: "linear", symbol, orderId }
    );
    order = data.list?.[0];
  } catch {
  }
  if (!order || !order.avgPrice || order.avgPrice === "0") {
    try {
      const data = await bybitRequest(
        creds,
        "GET",
        "/v5/order/history",
        { category: "linear", symbol, orderId }
      );
      order = data.list?.[0];
    } catch {
    }
  }
  return {
    avgPrice: order?.avgPrice || "0",
    cumExecQty: order?.cumExecQty || "0",
    cumExecFee: order?.cumExecFee || "0",
    status: order?.orderStatus || "UNKNOWN",
    profit: "0"
    // Bybit order API doesn't return PnL; use getBybitClosedPnl instead
  };
}
async function getBybitClosedPnl(creds, symbol, orderId) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const maxRetries = 3;
  const retryDelay = 2e3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const data = await bybitRequest(
        creds,
        "GET",
        "/v5/position/closed-pnl",
        { category: "linear", symbol, limit: 50 }
      );
      const record = data.list?.find((r) => r.orderId === orderId);
      if (record) {
        return parseFloat(record.closedPnl) || 0;
      }
      if (attempt < maxRetries - 1) {
        await sleep(retryDelay);
      }
    } catch {
      if (attempt < maxRetries - 1) {
        await sleep(retryDelay);
      }
    }
  }
  return 0;
}
async function getBybitInstrument(symbol) {
  try {
    const data = await fetch(
      `${BASE_URL2}/v5/market/instruments-info?category=linear&symbol=${symbol}`
    ).then((r) => r.json());
    const item = data.result?.list?.[0];
    if (!item) return null;
    return {
      qtyStep: item.lotSizeFilter.qtyStep,
      minOrderQty: item.lotSizeFilter.minOrderQty
    };
  } catch {
    return null;
  }
}

// server/bitget-client.ts
import crypto5 from "crypto";
var BASE_URL3 = "https://api.bitget.com";
function sign4(secretKey, timestamp2, method, requestPath, body = "") {
  const msg = timestamp2 + method.toUpperCase() + requestPath + body;
  return crypto5.createHmac("sha256", secretKey).update(msg).digest("base64");
}
async function bitgetRequest(creds, method, path2, params = {}) {
  const timestamp2 = Date.now().toString();
  let url = `${BASE_URL3}${path2}`;
  let body = "";
  let signPath = path2;
  if (method === "GET") {
    const qs = new URLSearchParams(params).toString();
    if (qs) {
      url += `?${qs}`;
      signPath += `?${qs}`;
    }
  } else {
    body = JSON.stringify(params);
  }
  const signature = sign4(creds.secretKey, timestamp2, method, signPath, body);
  const res = await fetch(url, {
    method,
    headers: {
      "ACCESS-KEY": creds.apiKey,
      "ACCESS-SIGN": signature,
      "ACCESS-TIMESTAMP": timestamp2,
      "ACCESS-PASSPHRASE": creds.passphrase,
      "Content-Type": "application/json",
      "locale": "en-US"
    },
    body: method === "POST" ? body : void 0
  });
  const data = await res.json();
  if (data.code !== "00000") {
    throw new Error(`Bitget API error ${data.code}: ${data.msg}`);
  }
  return data.data;
}
function toBitgetSymbol(instId) {
  const parts = instId.split("-");
  return parts.length >= 2 ? parts[0] + parts[1] : instId.replace(/-/g, "");
}
async function getBitgetOrderDetail(creds, symbol, orderId) {
  const productType = "USDT-FUTURES";
  const data = await bitgetRequest(
    creds,
    "GET",
    "/api/v2/mix/order/detail",
    { symbol, orderId, productType }
  );
  const order = Array.isArray(data) ? data[0] : data;
  return {
    avgPrice: order?.priceAvg || "0",
    filledQty: order?.baseVolume || "0",
    fee: order?.fee || "0",
    profit: order?.profit || "0",
    status: order?.state || "unknown"
  };
}
async function placeBitgetOrder(creds, instId, side, quantity) {
  const symbol = toBitgetSymbol(instId);
  const tradeSide = side.startsWith("close") ? "close" : "open";
  return bitgetRequest(creds, "POST", "/api/v2/mix/order/place-order", {
    symbol,
    productType: "USDT-FUTURES",
    marginMode: "crossed",
    marginCoin: "USDT",
    size: quantity,
    side,
    orderType: "market",
    tradeSide
  });
}
async function openBitgetLong(creds, instId, qty) {
  return placeBitgetOrder(creds, instId, "open_long", qty);
}
async function openBitgetShort(creds, instId, qty) {
  return placeBitgetOrder(creds, instId, "open_short", qty);
}
async function closeBitgetLong(creds, instId, qty) {
  return placeBitgetOrder(creds, instId, "close_long", qty);
}
async function closeBitgetShort(creds, instId, qty) {
  return placeBitgetOrder(creds, instId, "close_short", qty);
}

// server/gate-client.ts
import crypto6 from "crypto";
var BASE_URL4 = "https://api.gateio.ws";
function sign5(secretKey, method, path2, queryString, body, timestamp2) {
  const hashedBody = crypto6.createHash("sha512").update(body || "").digest("hex");
  const msg = `${method}
${path2}
${queryString}
${hashedBody}
${timestamp2}`;
  return crypto6.createHmac("sha512", secretKey).update(msg).digest("hex");
}
async function gateRequest(creds, method, path2, params = {}) {
  const timestamp2 = Math.floor(Date.now() / 1e3).toString();
  let url = `${BASE_URL4}${path2}`;
  let body = "";
  let queryString = "";
  if (method === "GET") {
    queryString = new URLSearchParams(params).toString();
    if (queryString) url += `?${queryString}`;
  } else {
    body = JSON.stringify(params);
  }
  const signature = sign5(creds.secretKey, method, path2, queryString, body, timestamp2);
  const res = await fetch(url, {
    method,
    headers: {
      "KEY": creds.apiKey,
      "SIGN": signature,
      "Timestamp": timestamp2,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: method === "POST" ? body : void 0
  });
  const data = await res.json();
  if (data.label) {
    throw new Error(`Gate.io API error ${data.label}: ${data.message}`);
  }
  return data;
}
function toGateContract(instId) {
  const parts = instId.split("-");
  return parts.length >= 2 ? `${parts[0]}_${parts[1]}` : instId.replace(/-/g, "_");
}
async function placeGateOrder(creds, instId, size, reduceOnly = false) {
  const contract = toGateContract(instId);
  return gateRequest(creds, "POST", "/api/v4/futures/usdt/orders", {
    contract,
    size,
    price: "0",
    // market order
    tif: "ioc",
    reduce_only: reduceOnly
  });
}
async function openGateLong(creds, instId, qty) {
  return placeGateOrder(creds, instId, qty);
}
async function openGateShort(creds, instId, qty) {
  return placeGateOrder(creds, instId, -qty);
}
async function closeGateLong(creds, instId, qty) {
  return placeGateOrder(creds, instId, -qty, true);
}
async function closeGateShort(creds, instId, qty) {
  return placeGateOrder(creds, instId, qty, true);
}
async function getGateOrderDetail(creds, orderId) {
  const data = await gateRequest(
    creds,
    "GET",
    `/api/v4/futures/usdt/orders/${orderId}`
  );
  return {
    fillPrice: data?.fill_price || "0",
    size: data?.size || 0,
    fee: data?.fee || "0",
    pnl: data?.pnl || "0",
    status: data?.status || "unknown"
  };
}
async function getGateInstrument(contract) {
  try {
    const data = await fetch(
      `${BASE_URL4}/api/v4/futures/usdt/contracts/${contract}`
    ).then((r) => r.json());
    return data;
  } catch {
    return null;
  }
}

// server/copy-engine.ts
http.globalAgent.maxSockets = 100;
https2.globalAgent.maxSockets = 100;
var SIGNAL_MAX_AGE_SECONDS = 30;
var sourceStates = /* @__PURE__ */ new Map();
function buildLoginArgs(creds) {
  const ts = Math.floor(Date.now() / 1e3).toString();
  const sign6 = crypto7.createHmac("sha256", creds.secretKey).update(ts + "GET/users/self/verify").digest("base64");
  return [{ apiKey: creds.apiKey, passphrase: creds.passphrase, timestamp: ts, sign: sign6 }];
}
function detectChanges(prev, incoming) {
  const changes = [];
  const seen = /* @__PURE__ */ new Set();
  for (const pos of incoming) {
    const rawPosSide = pos.posSide;
    const rawQty = parseFloat(pos.pos) || 0;
    const avgPx = parseFloat(pos.avgPx) || 0;
    if (rawPosSide === "net") {
      const key2 = `${pos.instId}_net`;
      seen.add(key2);
      const prevSnap2 = prev.get(key2);
      const prevQty2 = prevSnap2?.pos ?? 0;
      if (rawQty === prevQty2) continue;
      const prevAbs = Math.abs(prevQty2);
      const newAbs = Math.abs(rawQty);
      const prevSide = prevQty2 >= 0 ? "long" : "short";
      const newSide = rawQty >= 0 ? "long" : "short";
      if (prevQty2 === 0 && rawQty > 0) {
        changes.push({ action: "open_long", instId: pos.instId, posSide: "long", contractsDelta: newAbs, newPos: newAbs, avgPx });
      } else if (prevQty2 === 0 && rawQty < 0) {
        changes.push({ action: "open_short", instId: pos.instId, posSide: "short", contractsDelta: newAbs, newPos: newAbs, avgPx });
      } else if (rawQty === 0) {
        changes.push({ action: `close_${prevSide}`, instId: pos.instId, posSide: prevSide, contractsDelta: prevAbs, newPos: 0, avgPx });
      } else if (prevSide !== newSide) {
        changes.push({ action: `close_${prevSide}`, instId: pos.instId, posSide: prevSide, contractsDelta: prevAbs, newPos: 0, avgPx });
        changes.push({ action: `open_${newSide}`, instId: pos.instId, posSide: newSide, contractsDelta: newAbs, newPos: newAbs, avgPx });
      } else if (newAbs > prevAbs) {
        changes.push({ action: `add_${newSide}`, instId: pos.instId, posSide: newSide, contractsDelta: newAbs - prevAbs, newPos: newAbs, avgPx });
      } else {
        changes.push({ action: `reduce_${newSide}`, instId: pos.instId, posSide: newSide, contractsDelta: prevAbs - newAbs, newPos: newAbs, avgPx });
      }
      continue;
    }
    if (rawPosSide !== "long" && rawPosSide !== "short") continue;
    const posSide = rawPosSide;
    const key = `${pos.instId}_${posSide}`;
    seen.add(key);
    const newQty = rawQty;
    const prevSnap = prev.get(key);
    const prevQty = prevSnap?.pos ?? 0;
    if (newQty === prevQty) continue;
    const delta = newQty - prevQty;
    if (prevQty === 0 && newQty > 0) {
      changes.push({ action: `open_${posSide}`, instId: pos.instId, posSide, contractsDelta: newQty, newPos: newQty, avgPx });
    } else if (newQty === 0 && prevQty > 0) {
      changes.push({ action: `close_${posSide}`, instId: pos.instId, posSide, contractsDelta: prevQty, newPos: 0, avgPx });
    } else if (delta > 0) {
      changes.push({ action: `add_${posSide}`, instId: pos.instId, posSide, contractsDelta: delta, newPos: newQty, avgPx });
    } else {
      changes.push({ action: `reduce_${posSide}`, instId: pos.instId, posSide, contractsDelta: Math.abs(delta), newPos: newQty, avgPx });
    }
  }
  for (const [key, snap] of Array.from(prev.entries())) {
    if (!seen.has(key)) {
      const absPos = Math.abs(snap.pos);
      if (absPos > 0) {
        const side = snap.posSide === "net" ? snap.pos > 0 ? "long" : "short" : snap.posSide;
        changes.push({
          action: `close_${side}`,
          instId: snap.instId,
          posSide: side,
          contractsDelta: absPos,
          newPos: 0,
          avgPx: snap.avgPx
        });
      }
    }
  }
  return changes;
}
function toDbAction(action) {
  if (action === "open_long" || action === "add_long") return "open_long";
  if (action === "open_short" || action === "add_short") return "open_short";
  if (action === "close_long" || action === "reduce_long") return "close_long";
  if (action === "close_short" || action === "reduce_short") return "close_short";
  return "close_all";
}
async function executeCopyTrades(sourceId, change) {
  const dbAction = toDbAction(change.action);
  const logId = await createSignalLog({
    signalSourceId: sourceId,
    action: dbAction,
    symbol: change.instId.split("-")[0],
    quantity: change.contractsDelta.toFixed(8),
    price: change.avgPx > 0 ? change.avgPx.toFixed(8) : void 0,
    rawPayload: JSON.stringify(change),
    status: "processing",
    processedAt: /* @__PURE__ */ new Date()
  });
  const signalTime = Date.now();
  const userStrategies2 = await getEnabledStrategiesForSignal(sourceId);
  console.log(`[CopyEngine] ${change.action} ${change.contractsDelta} on ${change.instId} \u2192 ${userStrategies2.length} users`);
  if (userStrategies2.length === 0) {
    await updateSignalLog(logId, { status: "completed", errorMessage: "\u5F53\u524D\u65E0\u8BA2\u9605\u7528\u6237" });
    console.log(`[CopyEngine] Done: no subscribers`);
    return;
  }
  const instrument = await getInstrument(change.instId);
  const ctVal = instrument ? parseFloat(instrument.ctVal) : 0.01;
  const binanceSymbol = toBinanceSymbol(change.instId);
  const [binanceInfo] = await Promise.all([
    getBinanceInstrument(binanceSymbol)
  ]);
  async function executeForUser(us) {
    const api = await getExchangeApiById(us.exchangeApiId);
    if (!api || !api.isActive) {
      console.log(`[CopyEngine] Skipping user ${us.userId}: API not active`);
      return false;
    }
    const userExchange = (api.exchange || "okx").toLowerCase();
    const multiplier = parseFloat(us.multiplier);
    const isOpenAction = ["open_long", "open_short", "add_long", "add_short"].includes(change.action);
    if (isOpenAction) {
      const user = await getUserById(us.userId);
      if (user && parseFloat(user.balance) <= 0) {
        console.log(`[CopyEngine] \u26A0\uFE0F User ${us.userId} balance is 0, pausing all strategies`);
        await disableAllUserStrategies(us.userId);
        return false;
      }
    }
    let sz;
    let ethQty;
    let exchangeOrderId;
    const baseEthQty = change.contractsDelta * ctVal * multiplier;
    const signalEthQty = change.contractsDelta * ctVal;
    if (userExchange === "binance") {
      const precision = binanceInfo?.quantityPrecision ?? 3;
      const minQty = parseFloat(binanceInfo?.minQty ?? "0.001");
      let finalQty = baseEthQty;
      if (finalQty < minQty) finalQty = minQty;
      sz = finalQty.toFixed(precision);
      ethQty = parseFloat(sz);
      console.log(`[CopyEngine] Binance calc: user=${us.userId}, contracts=${change.contractsDelta}, ctVal=${ctVal}, mult=${multiplier}, baseEthQty=${baseEthQty}, finalSz=${sz} ETH`);
    } else if (userExchange === "bybit") {
      const bybitSymbol = toBybitSymbol(change.instId);
      const bybitInfo = await getBybitInstrument(bybitSymbol);
      const step = parseFloat(bybitInfo?.qtyStep ?? "0.001");
      const minQty = parseFloat(bybitInfo?.minOrderQty ?? "0.001");
      const rounded = Math.max(minQty, Math.floor(baseEthQty / step) * step);
      const decimals = step.toString().includes(".") ? step.toString().split(".")[1].length : 0;
      sz = rounded.toFixed(decimals);
      ethQty = parseFloat(sz);
      console.log(`[CopyEngine] Bybit calc: user=${us.userId}, contracts=${change.contractsDelta}, ctVal=${ctVal}, mult=${multiplier}, baseEthQty=${baseEthQty}, finalSz=${sz} ETH`);
    } else if (userExchange === "bitget") {
      const bitgetCtVal = 0.01;
      const bitgetContracts = Math.floor(baseEthQty / bitgetCtVal);
      const minSzBitget = 1;
      sz = Math.max(minSzBitget, bitgetContracts).toString();
      ethQty = parseFloat(sz) * bitgetCtVal;
      console.log(`[CopyEngine] Bitget calc: user=${us.userId}, contracts=${change.contractsDelta}, ctVal=${ctVal}, mult=${multiplier}, baseEthQty=${baseEthQty}, bitgetContracts=${sz}, ethQty=${ethQty} ETH`);
    } else if (userExchange === "gate") {
      const gateInstrument = await getGateInstrument(toGateContract(change.instId));
      const gateCtVal = gateInstrument ? parseFloat(gateInstrument.quanto_multiplier ?? "0.01") : 0.01;
      const gateContracts = Math.floor(baseEthQty / gateCtVal);
      const minSzGate = 1;
      sz = Math.max(minSzGate, gateContracts).toString();
      ethQty = parseFloat(sz) * gateCtVal;
      console.log(`[CopyEngine] Gate calc: user=${us.userId}, contracts=${change.contractsDelta}, ctVal=${ctVal}, mult=${multiplier}, baseEthQty=${baseEthQty}, gateContracts=${sz}, ethQty=${ethQty} ETH`);
    } else {
      const minSz = instrument ? parseFloat(instrument.minSz) : 0.01;
      const lotSz = instrument ? parseFloat(instrument.lotSz) : 0.01;
      let rawContracts = baseEthQty / ctVal;
      let alignedContracts = Math.round(rawContracts / lotSz) * lotSz;
      if (alignedContracts < minSz) alignedContracts = minSz;
      const lotDecimals = lotSz.toString().includes(".") ? lotSz.toString().split(".")[1].length : 0;
      sz = alignedContracts.toFixed(lotDecimals);
      ethQty = alignedContracts * ctVal;
      console.log(`[CopyEngine] OKX calc: user=${us.userId}, contracts=${change.contractsDelta}, ctVal=${ctVal}, mult=${multiplier}, baseEthQty=${baseEthQty}, okxContracts=${sz}, ethQty=${ethQty} ETH`);
    }
    const orderId = await createCopyOrder({
      userId: us.userId,
      signalLogId: logId,
      signalSourceId: sourceId,
      exchangeApiId: us.exchangeApiId,
      exchange: userExchange,
      symbol: change.instId,
      action: dbAction,
      multiplier: us.multiplier,
      signalQuantity: signalEthQty.toFixed(8),
      // 统一为 ETH
      actualQuantity: ethQty.toFixed(8),
      // 统一为 ETH
      openPrice: change.avgPx > 0 ? change.avgPx.toFixed(8) : void 0,
      openTime: /* @__PURE__ */ new Date(),
      status: "pending"
    });
    const elapsed = (Date.now() - signalTime) / 1e3;
    if (elapsed > SIGNAL_MAX_AGE_SECONDS) {
      console.warn(`[CopyEngine] \u23F0 Signal too old (${elapsed.toFixed(1)}s) for user ${us.userId}, skipping`);
      await updateCopyOrder(orderId, { status: "failed", errorMessage: `\u4FE1\u53F7\u8D85\u65F6 (${elapsed.toFixed(1)}s)` });
      return false;
    }
    if (userExchange === "binance") {
      const binCreds = {
        apiKey: decrypt(api.apiKeyEncrypted),
        secretKey: decrypt(api.secretKeyEncrypted)
      };
      if (change.action === "open_long" || change.action === "add_long") {
        const r = await placeBinanceOrder(binCreds, change.instId, "BUY", "LONG", sz);
        exchangeOrderId = String(r.orderId);
      } else if (change.action === "open_short" || change.action === "add_short") {
        const r = await placeBinanceOrder(binCreds, change.instId, "SELL", "SHORT", sz);
        exchangeOrderId = String(r.orderId);
      } else if (change.action === "close_long" || change.action === "reduce_long") {
        const r = await closeBinancePosition(binCreds, change.instId, "LONG", sz);
        exchangeOrderId = String(r.orderId);
      } else if (change.action === "close_short" || change.action === "reduce_short") {
        const r = await closeBinancePosition(binCreds, change.instId, "SHORT", sz);
        exchangeOrderId = String(r.orderId);
      }
    } else if (userExchange === "bybit") {
      const bybitCreds = {
        apiKey: decrypt(api.apiKeyEncrypted),
        secretKey: decrypt(api.secretKeyEncrypted)
      };
      if (change.action === "open_long" || change.action === "add_long") {
        const r = await placeBybitOrder(bybitCreds, change.instId, "Buy", "LONG", sz);
        exchangeOrderId = r.orderId;
      } else if (change.action === "open_short" || change.action === "add_short") {
        const r = await placeBybitOrder(bybitCreds, change.instId, "Sell", "SHORT", sz);
        exchangeOrderId = r.orderId;
      } else if (change.action === "close_long" || change.action === "reduce_long") {
        const r = await closeBybitPosition(bybitCreds, change.instId, "LONG", sz);
        exchangeOrderId = r.orderId;
      } else if (change.action === "close_short" || change.action === "reduce_short") {
        const r = await closeBybitPosition(bybitCreds, change.instId, "SHORT", sz);
        exchangeOrderId = r.orderId;
      }
    } else if (userExchange === "bitget") {
      const bitgetCreds = {
        apiKey: decrypt(api.apiKeyEncrypted),
        secretKey: decrypt(api.secretKeyEncrypted),
        passphrase: api.passphraseEncrypted ? decrypt(api.passphraseEncrypted) : ""
      };
      if (change.action === "open_long" || change.action === "add_long") {
        const r = await openBitgetLong(bitgetCreds, change.instId, sz);
        exchangeOrderId = r.orderId;
      } else if (change.action === "open_short" || change.action === "add_short") {
        const r = await openBitgetShort(bitgetCreds, change.instId, sz);
        exchangeOrderId = r.orderId;
      } else if (change.action === "close_long" || change.action === "reduce_long") {
        const r = await closeBitgetLong(bitgetCreds, change.instId, sz);
        exchangeOrderId = r.orderId;
      } else if (change.action === "close_short" || change.action === "reduce_short") {
        const r = await closeBitgetShort(bitgetCreds, change.instId, sz);
        exchangeOrderId = r.orderId;
      }
    } else if (userExchange === "gate") {
      const gateCreds = {
        apiKey: decrypt(api.apiKeyEncrypted),
        secretKey: decrypt(api.secretKeyEncrypted)
      };
      const gateQty = parseInt(sz, 10);
      if (change.action === "open_long" || change.action === "add_long") {
        const r = await openGateLong(gateCreds, change.instId, gateQty);
        exchangeOrderId = r.id.toString();
      } else if (change.action === "open_short" || change.action === "add_short") {
        const r = await openGateShort(gateCreds, change.instId, gateQty);
        exchangeOrderId = r.id.toString();
      } else if (change.action === "close_long" || change.action === "reduce_long") {
        const r = await closeGateLong(gateCreds, change.instId, gateQty);
        exchangeOrderId = r.id.toString();
      } else if (change.action === "close_short" || change.action === "reduce_short") {
        const r = await closeGateShort(gateCreds, change.instId, gateQty);
        exchangeOrderId = r.id.toString();
      }
    } else {
      const userCreds = {
        apiKey: decrypt(api.apiKeyEncrypted),
        secretKey: decrypt(api.secretKeyEncrypted),
        passphrase: api.passphraseEncrypted ? decrypt(api.passphraseEncrypted) : ""
      };
      if (change.action === "open_long" || change.action === "add_long") {
        const r = await placeOrder(userCreds, change.instId, "buy", "long", sz);
        exchangeOrderId = r.ordId;
      } else if (change.action === "open_short" || change.action === "add_short") {
        const r = await placeOrder(userCreds, change.instId, "sell", "short", sz);
        exchangeOrderId = r.ordId;
      } else if (change.action === "close_long" || change.action === "reduce_long") {
        const r = await closePosition(userCreds, change.instId, "long", sz);
        exchangeOrderId = r.ordId;
      } else if (change.action === "close_short" || change.action === "reduce_short") {
        const r = await closePosition(userCreds, change.instId, "short", sz);
        exchangeOrderId = r.ordId;
      }
    }
    const orderTime = Date.now() - signalTime;
    console.log(`[CopyEngine] \u2705 User ${us.userId}: ${change.action} ${sz} on ${change.instId}, ordId=${exchangeOrderId}, latency=${orderTime}ms`);
    const isCloseAction = ["close_long", "close_short", "reduce_long", "reduce_short"].includes(change.action);
    if (isCloseAction && exchangeOrderId) {
      await updateCopyOrder(orderId, {
        status: "closed",
        exchangeOrderId,
        closeTime: /* @__PURE__ */ new Date()
      });
      try {
        let closePrice = 0;
        let fee = 0;
        let realizedPnl = 0;
        if (userExchange === "binance") {
          const symbol = toBinanceSymbol(change.instId);
          const detail = await getBinanceOrderDetail(
            { apiKey: decrypt(api.apiKeyEncrypted), secretKey: decrypt(api.secretKeyEncrypted) },
            symbol,
            exchangeOrderId
          );
          closePrice = parseFloat(detail.avgPrice) || 0;
          fee = Math.abs(parseFloat(detail.commission) || 0);
          realizedPnl = parseFloat(detail.realizedPnl) || 0;
        } else if (userExchange === "bybit") {
          const symbol = toBybitSymbol(change.instId);
          const detail = await getBybitOrderDetail(
            { apiKey: decrypt(api.apiKeyEncrypted), secretKey: decrypt(api.secretKeyEncrypted) },
            symbol,
            exchangeOrderId
          );
          closePrice = parseFloat(detail.avgPrice) || 0;
          fee = Math.abs(parseFloat(detail.cumExecFee) || 0);
          realizedPnl = await getBybitClosedPnl(
            { apiKey: decrypt(api.apiKeyEncrypted), secretKey: decrypt(api.secretKeyEncrypted) },
            symbol,
            exchangeOrderId
          );
        } else if (userExchange === "bitget") {
          const symbol = toBitgetSymbol(change.instId);
          const detail = await getBitgetOrderDetail(
            { apiKey: decrypt(api.apiKeyEncrypted), secretKey: decrypt(api.secretKeyEncrypted), passphrase: api.passphraseEncrypted ? decrypt(api.passphraseEncrypted) : "" },
            symbol,
            exchangeOrderId
          );
          closePrice = parseFloat(detail.avgPrice) || 0;
          fee = Math.abs(parseFloat(detail.fee) || 0);
          realizedPnl = parseFloat(detail.profit) || 0;
        } else if (userExchange === "gate") {
          const detail = await getGateOrderDetail(
            { apiKey: decrypt(api.apiKeyEncrypted), secretKey: decrypt(api.secretKeyEncrypted) },
            exchangeOrderId
          );
          closePrice = parseFloat(detail.fillPrice) || 0;
          fee = Math.abs(parseFloat(detail.fee) || 0);
          realizedPnl = parseFloat(detail.pnl) || 0;
        } else {
          const detail = await getOkxOrderDetail(
            { apiKey: decrypt(api.apiKeyEncrypted), secretKey: decrypt(api.secretKeyEncrypted), passphrase: api.passphraseEncrypted ? decrypt(api.passphraseEncrypted) : "" },
            change.instId,
            exchangeOrderId
          );
          closePrice = parseFloat(detail.avgPx) || 0;
          fee = Math.abs(parseFloat(detail.fee) || 0);
          realizedPnl = parseFloat(detail.pnl) || 0;
        }
        const allOpenOrders = await findAllUserOpenOrders(us.userId, change.instId, change.action);
        const openOrder = allOpenOrders[0] || null;
        let rawPnl = realizedPnl;
        if (allOpenOrders.length > 0) {
          const totalQty = allOpenOrders.reduce((sum, o) => sum + parseFloat(o.actualQuantity || "0"), 0);
          for (const openOrd of allOpenOrders) {
            const ordQty = parseFloat(openOrd.actualQuantity || "0");
            const ratio = totalQty > 0 ? ordQty / totalQty : 1 / allOpenOrders.length;
            const ordRawPnl = rawPnl * ratio;
            const ordFee = fee * ratio;
            const ordNetPnl = ordRawPnl - ordFee;
            await updateCopyOrder(openOrd.id, {
              closePrice: closePrice.toFixed(8),
              closeTime: /* @__PURE__ */ new Date(),
              closeOrderId: exchangeOrderId,
              realizedPnl: ordRawPnl.toFixed(8),
              fee: ordFee.toFixed(8),
              netPnl: ordNetPnl.toFixed(8),
              status: "closed"
            });
            console.log(`[CopyEngine] \u{1F4CA} User ${us.userId} order ${openOrd.id}: ratio=${ratio.toFixed(4)}, netPnl=${ordNetPnl.toFixed(4)}`);
          }
        }
        const netPnl = rawPnl - fee;
        await updateCopyOrder(orderId, {
          openPrice: closePrice.toFixed(8),
          closePrice: closePrice.toFixed(8),
          realizedPnl: rawPnl.toFixed(8),
          fee: fee.toFixed(8),
          netPnl: netPnl.toFixed(8)
        });
        console.log(`[CopyEngine] \u{1F4CA} User ${us.userId}: totalPnl=${rawPnl.toFixed(4)}, fee=${fee.toFixed(4)}, netPnl=${netPnl.toFixed(4)}, closePrice=${closePrice}, openOrders=${allOpenOrders.length}`);
        const revenueOrderId = orderId;
        if (netPnl > 0) {
          try {
            await processRevenueShare({
              copyOrderId: revenueOrderId,
              traderId: us.userId,
              netPnl
            });
            console.log(`[CopyEngine] \u{1F4B0} Revenue share processed for user ${us.userId}, netPnl=${netPnl.toFixed(4)}`);
          } catch (rsErr) {
            const rsMsg = rsErr instanceof Error ? rsErr.message : String(rsErr);
            console.error(`[CopyEngine] \u26A0\uFE0F Revenue share failed for user ${us.userId}: ${rsMsg}`);
          }
        }
      } catch (pnlErr) {
        const pnlMsg = pnlErr instanceof Error ? pnlErr.message : String(pnlErr);
        console.error(`[CopyEngine] \u26A0\uFE0F PnL finalization failed for user ${us.userId}: ${pnlMsg}`);
      }
    } else {
      await updateCopyOrder(orderId, {
        status: "open",
        exchangeOrderId,
        openTime: /* @__PURE__ */ new Date()
      });
      if (exchangeOrderId) {
        (async () => {
          try {
            let actualOpenPrice = null;
            if (userExchange === "binance") {
              const symbol = toBinanceSymbol(change.instId);
              const detail = await getBinanceOrderDetail(
                { apiKey: decrypt(api.apiKeyEncrypted), secretKey: decrypt(api.secretKeyEncrypted) },
                symbol,
                exchangeOrderId
              );
              actualOpenPrice = parseFloat(detail.avgPrice) || null;
            } else if (userExchange === "bybit") {
              const symbol = toBybitSymbol(change.instId);
              const detail = await getBybitOrderDetail(
                { apiKey: decrypt(api.apiKeyEncrypted), secretKey: decrypt(api.secretKeyEncrypted) },
                symbol,
                exchangeOrderId
              );
              actualOpenPrice = parseFloat(detail.avgPrice) || null;
            } else if (userExchange === "bitget") {
              const symbol = toBitgetSymbol(change.instId);
              const detail = await getBitgetOrderDetail(
                { apiKey: decrypt(api.apiKeyEncrypted), secretKey: decrypt(api.secretKeyEncrypted), passphrase: api.passphraseEncrypted ? decrypt(api.passphraseEncrypted) : "" },
                symbol,
                exchangeOrderId
              );
              actualOpenPrice = parseFloat(detail.avgPrice) || null;
            } else if (userExchange === "gate") {
              const detail = await getGateOrderDetail(
                { apiKey: decrypt(api.apiKeyEncrypted), secretKey: decrypt(api.secretKeyEncrypted) },
                exchangeOrderId
              );
              actualOpenPrice = parseFloat(detail.fillPrice) || null;
            } else {
              const detail = await getOkxOrderDetail(
                { apiKey: decrypt(api.apiKeyEncrypted), secretKey: decrypt(api.secretKeyEncrypted), passphrase: api.passphraseEncrypted ? decrypt(api.passphraseEncrypted) : "" },
                change.instId,
                exchangeOrderId
              );
              actualOpenPrice = parseFloat(detail.avgPx) || null;
            }
            if (actualOpenPrice && actualOpenPrice > 0) {
              await updateCopyOrder(orderId, { openPrice: actualOpenPrice.toFixed(8) });
              console.log(`[CopyEngine] \u{1F4CC} User ${us.userId} order ${orderId}: actual openPrice=${actualOpenPrice}`);
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[CopyEngine] \u26A0\uFE0F Failed to fetch actual open price for user ${us.userId} order ${orderId}: ${msg}`);
          }
        })();
      }
    }
    return true;
  }
  const BATCH_SIZE = 20;
  const allResults = [];
  for (let i = 0; i < userStrategies2.length; i += BATCH_SIZE) {
    const batch = userStrategies2.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(userStrategies2.length / BATCH_SIZE);
    if (totalBatches > 1) {
      console.log(`[CopyEngine] Batch ${batchNum}/${totalBatches}: ${batch.length} users`);
    }
    const batchResults = await Promise.allSettled(
      batch.map(async (us) => {
        try {
          return await executeForUser(us);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[CopyEngine] \u274C User ${us.userId} copy failed: ${msg}`);
          try {
            const recentOrders = await listCopyOrdersBySignalLog(logId, us.userId);
            if (recentOrders.length > 0) {
              await updateCopyOrder(recentOrders[0].id, { status: "failed", errorMessage: msg });
            }
          } catch {
          }
          return false;
        }
      })
    );
    for (const r of batchResults) {
      allResults.push(r.status === "fulfilled" && r.value === true);
    }
  }
  const successCount = allResults.filter(Boolean).length;
  const totalTime = Date.now() - signalTime;
  await updateSignalLog(logId, {
    status: "completed",
    errorMessage: successCount === 0 ? `\u6240\u6709 ${userStrategies2.length} \u4E2A\u7528\u6237\u8DDF\u5355\u5931\u8D25` : successCount < userStrategies2.length ? `${successCount}/${userStrategies2.length} \u4E2A\u7528\u6237\u8DDF\u5355\u6210\u529F` : void 0
  });
  console.log(`[CopyEngine] Done: ${successCount}/${userStrategies2.length} succeeded, total=${totalTime}ms, batches=${Math.ceil(userStrategies2.length / BATCH_SIZE)}`);
}
function connectSource(state) {
  if (state.ws) {
    try {
      state.ws.terminate();
    } catch {
    }
    state.ws = null;
  }
  console.log(`[CopyEngine] Connecting WS for "${state.name}" (${state.instId})`);
  const ws = new WebSocket("wss://ws.okx.com:8443/ws/v5/private");
  state.ws = ws;
  ws.on("open", () => {
    console.log(`[CopyEngine] WS open for "${state.name}", logging in...`);
    ws.send(JSON.stringify({ op: "login", args: buildLoginArgs(state.creds) }));
    if (state.pingTimer) clearInterval(state.pingTimer);
    state.pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 25e3);
  });
  ws.on("message", (raw) => {
    const msg = raw.toString();
    if (msg === "pong") return;
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }
    if (data.event === "login") {
      if (data.code === "0") {
        console.log(`[CopyEngine] \u2705 Logged in for "${state.name}", subscribing...`);
        state.isConnected = true;
        ws.send(JSON.stringify({
          op: "subscribe",
          args: [{ channel: "positions", instType: "SWAP" }]
        }));
      } else {
        console.error(`[CopyEngine] \u274C Login failed for "${state.name}": ${data.msg}`);
      }
      return;
    }
    if (data.event === "subscribe") {
      console.log(`[CopyEngine] \u2705 Subscribed to positions for "${state.name}"`);
      return;
    }
    if (data.arg && typeof data.arg === "object" && data.arg.channel === "positions" && Array.isArray(data.data)) {
      const incoming = data.data;
      const relevant = incoming.filter(
        (p) => state.instId === "ALL" || p.instId === state.instId
      );
      if (relevant.length === 0) return;
      if (state.initialSync) {
        console.log(`[CopyEngine] Initial sync for "${state.name}": storing baseline positions, skipping trade execution`);
        for (const pos of relevant) {
          const rawPosSide = pos.posSide;
          if (rawPosSide !== "long" && rawPosSide !== "short" && rawPosSide !== "net") continue;
          const key = `${pos.instId}_${rawPosSide}`;
          const qty = parseFloat(pos.pos) || 0;
          if (qty === 0) {
            state.positions.delete(key);
          } else {
            state.positions.set(key, {
              instId: pos.instId,
              posSide: rawPosSide,
              pos: qty,
              avgPx: parseFloat(pos.avgPx) || 0
            });
          }
        }
        state.initialSync = false;
        return;
      }
      const changes = detectChanges(state.positions, relevant);
      for (const pos of relevant) {
        const rawPosSide = pos.posSide;
        if (rawPosSide !== "long" && rawPosSide !== "short" && rawPosSide !== "net") continue;
        const key = `${pos.instId}_${rawPosSide}`;
        const qty = parseFloat(pos.pos) || 0;
        if (qty === 0 && rawPosSide !== "net") {
          state.positions.delete(key);
        } else if (qty === 0 && rawPosSide === "net") {
          state.positions.delete(key);
        } else {
          state.positions.set(key, {
            instId: pos.instId,
            posSide: rawPosSide,
            pos: qty,
            avgPx: parseFloat(pos.avgPx) || 0
          });
        }
      }
      for (const change of changes) {
        console.log(`[CopyEngine] Change: ${change.action} ${change.contractsDelta} on ${change.instId}`);
        executeCopyTrades(state.id, change).catch(
          (err) => console.error("[CopyEngine] executeCopyTrades error:", err)
        );
      }
    }
  });
  ws.on("close", (code, reason) => {
    console.log(`[CopyEngine] WS closed for "${state.name}": ${code} ${reason.toString()}`);
    state.isConnected = false;
    if (state.pingTimer) {
      clearInterval(state.pingTimer);
      state.pingTimer = null;
    }
    scheduleReconnect(state);
  });
  ws.on("error", (err) => {
    console.error(`[CopyEngine] WS error for "${state.name}": ${err.message}`);
  });
}
function scheduleReconnect(state) {
  if (state.reconnectTimer) return;
  console.log(`[CopyEngine] Reconnecting "${state.name}" in 10s...`);
  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    connectSource(state);
  }, 1e4);
}
async function startCopyEngine() {
  console.log("[CopyEngine] Starting...");
  const sources = await listSignalSources(true);
  console.log(`[CopyEngine] ${sources.length} active signal sources`);
  for (const src of sources) {
    if (!src.apiKeyEncrypted || !src.apiSecretEncrypted) {
      console.log(`[CopyEngine] Skipping "${src.name}": no API credentials`);
      continue;
    }
    if (src.exchange !== "okx") {
      console.log(`[CopyEngine] Skipping "${src.name}": exchange "${src.exchange}" not supported yet`);
      continue;
    }
    const creds = {
      apiKey: decrypt(src.apiKeyEncrypted),
      secretKey: decrypt(src.apiSecretEncrypted),
      passphrase: src.passphraseEncrypted ? decrypt(src.passphraseEncrypted) : ""
    };
    const state = {
      id: src.id,
      name: src.name,
      instId: src.tradingPair.includes("-") ? src.tradingPair : `${src.symbol}-USDT-SWAP`,
      creds,
      ws: null,
      positions: /* @__PURE__ */ new Map(),
      reconnectTimer: null,
      pingTimer: null,
      isConnected: false,
      initialSync: true
    };
    sourceStates.set(src.id, state);
    connectSource(state);
  }
  console.log("[CopyEngine] Started.");
}
async function reloadSignalSource(sourceId) {
  const existing = sourceStates.get(sourceId);
  if (existing) {
    if (existing.ws) try {
      existing.ws.terminate();
    } catch {
    }
    if (existing.pingTimer) clearInterval(existing.pingTimer);
    if (existing.reconnectTimer) clearTimeout(existing.reconnectTimer);
    sourceStates.delete(sourceId);
  }
  const sources = await listSignalSources(false);
  const src = sources.find((s) => s.id === sourceId);
  if (!src || !src.isActive || !src.apiKeyEncrypted || !src.apiSecretEncrypted) return;
  const creds = {
    apiKey: decrypt(src.apiKeyEncrypted),
    secretKey: decrypt(src.apiSecretEncrypted),
    passphrase: src.passphraseEncrypted ? decrypt(src.passphraseEncrypted) : ""
  };
  const state = {
    id: src.id,
    name: src.name,
    instId: src.tradingPair.includes("-") ? src.tradingPair : `${src.symbol}-USDT-SWAP`,
    creds,
    ws: null,
    positions: /* @__PURE__ */ new Map(),
    reconnectTimer: null,
    pingTimer: null,
    isConnected: false,
    initialSync: true
  };
  sourceStates.set(src.id, state);
  connectSource(state);
}
function getCopyEngineStatus() {
  return Array.from(sourceStates.values()).map((s) => ({
    id: s.id,
    name: s.name,
    instId: s.instId,
    connected: s.isConnected,
    positions: Array.from(s.positions.values())
  }));
}

// server/routers/strategy.ts
var strategyRouter = router({
  // Public: list active strategies
  list: publicProcedure.query(async () => {
    const sources = await listSignalSources(true);
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      symbol: s.symbol,
      tradingPair: s.tradingPair,
      referencePosition: s.referencePosition,
      expectedMonthlyReturnMin: s.expectedMonthlyReturnMin,
      expectedMonthlyReturnMax: s.expectedMonthlyReturnMax,
      description: s.description,
      isActive: s.isActive
    }));
  }),
  // User's strategy subscriptions
  myStrategies: protectedProcedure.query(async ({ ctx }) => {
    const strategies = await getUserStrategies(ctx.user.id);
    const sources = await listSignalSources(false);
    const apis = await getExchangeApisByUserId(ctx.user.id);
    return strategies.map((s) => ({
      ...s,
      signalSource: sources.find((src) => src.id === s.signalSourceId),
      exchangeApi: apis.find((a) => a.id === s.exchangeApiId)
    }));
  }),
  setStrategy: protectedProcedure.input(z6.object({
    signalSourceId: z6.number(),
    exchangeApiId: z6.number(),
    multiplier: z6.number().min(0.1).max(100),
    isEnabled: z6.boolean()
  })).mutation(async ({ input, ctx }) => {
    const api = await getExchangeApiById(input.exchangeApiId);
    if (!api || api.userId !== ctx.user.id) throw new TRPCError6({ code: "FORBIDDEN", message: "\u4EA4\u6613\u6240API\u4E0D\u5B58\u5728" });
    if (!api.isActive) throw new TRPCError6({ code: "BAD_REQUEST", message: "\u4EA4\u6613\u6240API\u5DF2\u7981\u7528\uFF0C\u8BF7\u5148\u542F\u7528" });
    const source = await getSignalSourceById(input.signalSourceId);
    if (!source) throw new TRPCError6({ code: "NOT_FOUND", message: "\u7B56\u7565\u4E0D\u5B58\u5728" });
    if (input.isEnabled) {
      const user = await getUserById(ctx.user.id);
      if (!user || parseFloat(user.balance) <= 0) {
        throw new TRPCError6({ code: "BAD_REQUEST", message: "\u8D26\u6237\u4F59\u989D\u4E0D\u8DB3\uFF0C\u8BF7\u5148\u5145\u503C\u540E\u518D\u5F00\u542F\u7B56\u7565" });
      }
    }
    await upsertUserStrategy({
      userId: ctx.user.id,
      signalSourceId: input.signalSourceId,
      exchangeApiId: input.exchangeApiId,
      multiplier: input.multiplier.toFixed(2),
      isEnabled: input.isEnabled
    });
    return { success: true };
  }),
  // Orders
  orders: protectedProcedure.input(z6.object({ page: z6.number().default(1), limit: z6.number().default(20) })).query(async ({ input, ctx }) => {
    return listCopyOrders(ctx.user.id, input.page, input.limit);
  }),
  orderStats: protectedProcedure.query(async ({ ctx }) => {
    return getUserOrderStats(ctx.user.id);
  }),
  revenueShareStats: protectedProcedure.query(async ({ ctx }) => {
    return getUserRevenueShareStats(ctx.user.id);
  }),
  // Admin: manage signal sources
  adminListSources: adminProcedure.query(async () => {
    const sources = await listSignalSources(false);
    return sources.map((s) => ({
      ...s,
      apiKeyMasked: s.apiKeyEncrypted ? maskApiKey(decrypt(s.apiKeyEncrypted)) : null,
      apiSecretMasked: s.apiSecretEncrypted ? "****" : null,
      passphraseMasked: s.passphraseEncrypted ? "****" : null,
      apiKeyEncrypted: void 0,
      apiSecretEncrypted: void 0,
      passphraseEncrypted: void 0
    }));
  }),
  adminCreateSource: adminProcedure.input(z6.object({
    name: z6.string().min(1),
    symbol: z6.string().min(1),
    tradingPair: z6.string().min(1),
    referencePosition: z6.number().positive(),
    expectedMonthlyReturnMin: z6.number().min(0),
    expectedMonthlyReturnMax: z6.number().min(0),
    description: z6.string().optional(),
    apiKey: z6.string().optional(),
    apiSecret: z6.string().optional(),
    webhookSecret: z6.string().optional(),
    exchange: z6.enum(["okx", "binance", "bybit", "bitget", "gate"]).default("okx"),
    passphrase: z6.string().optional()
  })).mutation(async ({ input }) => {
    await createSignalSource({
      name: input.name,
      symbol: input.symbol,
      tradingPair: input.tradingPair,
      referencePosition: input.referencePosition.toFixed(8),
      expectedMonthlyReturnMin: input.expectedMonthlyReturnMin.toFixed(2),
      expectedMonthlyReturnMax: input.expectedMonthlyReturnMax.toFixed(2),
      description: input.description,
      apiKeyEncrypted: input.apiKey ? encrypt(input.apiKey) : void 0,
      apiSecretEncrypted: input.apiSecret ? encrypt(input.apiSecret) : void 0,
      webhookSecret: input.webhookSecret,
      exchange: input.exchange,
      passphraseEncrypted: input.passphrase ? encrypt(input.passphrase) : void 0,
      isActive: true
    });
    return { success: true };
  }),
  adminUpdateSource: adminProcedure.input(z6.object({
    id: z6.number(),
    name: z6.string().optional(),
    symbol: z6.string().optional(),
    tradingPair: z6.string().optional(),
    referencePosition: z6.number().optional(),
    expectedMonthlyReturnMin: z6.number().optional(),
    expectedMonthlyReturnMax: z6.number().optional(),
    description: z6.string().optional(),
    isActive: z6.boolean().optional(),
    apiKey: z6.string().optional(),
    apiSecret: z6.string().optional(),
    webhookSecret: z6.string().optional(),
    exchange: z6.enum(["okx", "binance", "bybit", "bitget", "gate"]).optional(),
    passphrase: z6.string().optional()
  })).mutation(async ({ input }) => {
    const { id, apiKey, apiSecret, webhookSecret: ws, exchange, passphrase, ...rest } = input;
    const updateData = {};
    if (rest.name !== void 0) updateData.name = rest.name;
    if (rest.symbol !== void 0) updateData.symbol = rest.symbol;
    if (rest.tradingPair !== void 0) updateData.tradingPair = rest.tradingPair;
    if (rest.referencePosition !== void 0) updateData.referencePosition = rest.referencePosition.toFixed(8);
    if (rest.expectedMonthlyReturnMin !== void 0) updateData.expectedMonthlyReturnMin = rest.expectedMonthlyReturnMin.toFixed(2);
    if (rest.expectedMonthlyReturnMax !== void 0) updateData.expectedMonthlyReturnMax = rest.expectedMonthlyReturnMax.toFixed(2);
    if (rest.description !== void 0) updateData.description = rest.description;
    if (rest.isActive !== void 0) updateData.isActive = rest.isActive;
    if (apiKey !== void 0) updateData.apiKeyEncrypted = apiKey ? encrypt(apiKey) : null;
    if (apiSecret !== void 0) updateData.apiSecretEncrypted = apiSecret ? encrypt(apiSecret) : null;
    if (ws !== void 0) updateData.webhookSecret = ws || null;
    if (exchange !== void 0) updateData.exchange = exchange;
    if (passphrase !== void 0) updateData.passphraseEncrypted = passphrase ? encrypt(passphrase) : null;
    await updateSignalSource(id, updateData);
    reloadSignalSource(id).catch(console.error);
    return { success: true };
  }),
  adminSignalLogs: adminProcedure.input(z6.object({ signalSourceId: z6.number().optional(), page: z6.number().default(1), limit: z6.number().default(20) })).query(async ({ input }) => {
    const result = await listSignalLogs(input.signalSourceId, input.page, input.limit);
    const itemsWithOrders = await Promise.all(
      result.items.map(async (log) => {
        const orders = await listCopyOrdersBySignalLog(log.id);
        return { ...log, copyOrders: orders };
      })
    );
    return { ...result, items: itemsWithOrders };
  }),
  adminAllOrders: adminProcedure.input(z6.object({ page: z6.number().default(1), limit: z6.number().default(30) })).query(async ({ input }) => {
    return listAllCopyOrdersWithUser(input.page, input.limit);
  }),
  adminMarkAbnormal: adminProcedure.input(z6.object({ orderId: z6.number(), isAbnormal: z6.boolean(), note: z6.string().optional() })).mutation(async ({ input }) => {
    await updateCopyOrder(input.orderId, { isAbnormal: input.isAbnormal, abnormalNote: input.note });
    return { success: true };
  }),
  // Engine status (for admin dashboard)
  adminEngineStatus: adminProcedure.query(() => {
    return getCopyEngineStatus();
  }),
  // Reload a specific signal source in the engine
  adminReloadEngine: adminProcedure.input(z6.object({ sourceId: z6.number() })).mutation(async ({ input }) => {
    await reloadSignalSource(input.sourceId);
    return { success: true };
  }),
  // Webhook: receive signal from external source
  receiveSignal: publicProcedure.input(z6.object({
    signalSourceId: z6.number(),
    secret: z6.string(),
    action: z6.enum(["open_long", "open_short", "close_long", "close_short", "close_all"]),
    symbol: z6.string(),
    quantity: z6.number().positive(),
    price: z6.number().optional()
  })).mutation(async ({ input }) => {
    const source = await getSignalSourceById(input.signalSourceId);
    if (!source) throw new TRPCError6({ code: "NOT_FOUND", message: "\u4FE1\u53F7\u6E90\u4E0D\u5B58\u5728" });
    if (!source.isActive) throw new TRPCError6({ code: "FORBIDDEN", message: "\u4FE1\u53F7\u6E90\u5DF2\u505C\u7528" });
    if (source.webhookSecret && source.webhookSecret !== input.secret) {
      throw new TRPCError6({ code: "UNAUTHORIZED", message: "\u4FE1\u53F7\u9A8C\u8BC1\u5931\u8D25" });
    }
    const logId = await createSignalLog({
      signalSourceId: input.signalSourceId,
      action: input.action,
      symbol: input.symbol,
      quantity: input.quantity.toFixed(8),
      price: input.price?.toFixed(8),
      rawPayload: JSON.stringify(input),
      status: "processing",
      processedAt: /* @__PURE__ */ new Date()
    });
    const userStrategies2 = await getEnabledStrategiesForSignal(input.signalSourceId);
    let successCount = 0;
    for (const us of userStrategies2) {
      try {
        const api = await getExchangeApiById(us.exchangeApiId);
        const actualQty = parseFloat(input.quantity.toFixed(8)) * parseFloat(us.multiplier);
        await createCopyOrder({
          userId: us.userId,
          signalLogId: logId,
          signalSourceId: input.signalSourceId,
          exchangeApiId: us.exchangeApiId,
          exchange: api?.exchange || "binance",
          symbol: input.symbol,
          action: input.action,
          multiplier: us.multiplier,
          signalQuantity: input.quantity.toFixed(8),
          actualQuantity: actualQty.toFixed(8),
          openPrice: input.price?.toFixed(8),
          openTime: /* @__PURE__ */ new Date(),
          status: "open"
        });
        successCount++;
      } catch (err) {
        console.error(`[Signal] Failed to create copy order for user ${us.userId}:`, err);
      }
    }
    if (logId) await updateSignalLog(logId, { status: "completed" });
    return { success: true, processedUsers: successCount };
  }),
  // Simulate close order with PnL (for demo/testing)
  simulateClose: adminProcedure.input(z6.object({
    orderId: z6.number(),
    closePrice: z6.number(),
    realizedPnl: z6.number(),
    fee: z6.number().default(0)
  })).mutation(async ({ input }) => {
    const netPnl = input.realizedPnl - input.fee;
    await updateCopyOrder(input.orderId, {
      closePrice: input.closePrice.toFixed(8),
      closeTime: /* @__PURE__ */ new Date(),
      realizedPnl: input.realizedPnl.toFixed(8),
      fee: input.fee.toFixed(8),
      netPnl: netPnl.toFixed(8),
      status: "closed"
    });
    const { items } = await listCopyOrders(void 0, 1, 1e3);
    const order = items.find((o) => o.id === input.orderId);
    if (order && netPnl > 0) {
      await processRevenueShare({
        copyOrderId: input.orderId,
        traderId: order.userId,
        netPnl
      });
    }
    return { success: true };
  })
});

// server/routers/user.ts
import { TRPCError as TRPCError7 } from "@trpc/server";
import { z as z7 } from "zod";
var userRouter = router({
  profile: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError7({ code: "NOT_FOUND" });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      inviteCode: user.inviteCode,
      balance: user.balance,
      points: user.points,
      totalProfit: user.totalProfit,
      totalLoss: user.totalLoss,
      lastPointsRedeemMonth: user.lastPointsRedeemMonth,
      revenueShareRatio: user.revenueShareRatio,
      role: user.role,
      createdAt: user.createdAt
    };
  }),
  teamStats: protectedProcedure.query(async ({ ctx }) => {
    return getTeamStats(ctx.user.id);
  }),
  myRevenueShares: protectedProcedure.input(z7.object({ page: z7.number().default(1), limit: z7.number().default(20) })).query(async ({ input, ctx }) => {
    return listRevenueShareRecords(ctx.user.id, input.page, input.limit);
  }),
  myInvitees: protectedProcedure.query(async ({ ctx }) => {
    return getMyInvitees(ctx.user.id);
  }),
  setInviteeRevenueShare: protectedProcedure.input(z7.object({ inviteeId: z7.number(), ratio: z7.number().min(0).max(70) })).mutation(async ({ input, ctx }) => {
    const invitee = await getUserById(input.inviteeId);
    if (!invitee) throw new TRPCError7({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
    if (invitee.referrerId !== ctx.user.id) throw new TRPCError7({ code: "FORBIDDEN", message: "\u60A8\u53EA\u80FD\u7ED9\u81EA\u5DF1\u9080\u8BF7\u7684\u4EBA\u8BBE\u7F6E\u5206\u6210\u6BD4\u4F8B" });
    const currentUser = await getUserById(ctx.user.id);
    const myRatio = parseFloat(currentUser?.revenueShareRatio || "0");
    if (input.ratio < myRatio) {
      throw new TRPCError7({ code: "BAD_REQUEST", message: `\u5206\u6210\u6BD4\u4F8B\u4E0D\u80FD\u4F4E\u4E8E\u60A8\u81EA\u5DF1\u7684\u6BD4\u4F8B (${myRatio}%)` });
    }
    if (input.ratio > 70) {
      throw new TRPCError7({ code: "BAD_REQUEST", message: "\u5206\u6210\u6BD4\u4F8B\u4E0D\u80FD\u8D85\u8FC770%" });
    }
    await updateUser(input.inviteeId, { revenueShareRatio: input.ratio.toFixed(2) });
    return { success: true };
  }),
  // 查看直推成员的交易记录（只能查看自己直接邀请的人）
  inviteeMemberOrders: protectedProcedure.input(z7.object({ inviteeId: z7.number(), page: z7.number().default(1), limit: z7.number().default(20) })).query(async ({ input, ctx }) => {
    const invitee = await getUserById(input.inviteeId);
    if (!invitee) throw new TRPCError7({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
    if (invitee.referrerId !== ctx.user.id) throw new TRPCError7({ code: "FORBIDDEN", message: "\u60A8\u53EA\u80FD\u67E5\u770B\u81EA\u5DF1\u76F4\u63A5\u9080\u8BF7\u7684\u6210\u5458" });
    const orders = await listCopyOrders(input.inviteeId, input.page, input.limit);
    const stats = await getUserOrderStats(input.inviteeId);
    return { ...orders, stats, inviteeName: invitee.name || `\u7528\u6237#${invitee.id}` };
  }),
  // Admin
  adminDashboard: adminProcedure.query(async () => {
    return getAdminDashboardStats();
  }),
  adminList: adminProcedure.input(z7.object({ page: z7.number().default(1), limit: z7.number().default(20) })).query(async ({ input }) => {
    const { items, total } = await listUsers(input.page, input.limit);
    const enriched = await Promise.all(items.map(async (u) => {
      const apis = await getExchangeApisByUserId(u.id);
      return {
        ...u,
        hasExchangeApi: apis.length > 0,
        exchangeApiCount: apis.length,
        exchangeTypes: Array.from(new Set(apis.map((a) => a.exchange)))
      };
    }));
    return { items: enriched, total };
  }),
  adminGetUser: adminProcedure.input(z7.object({ userId: z7.number() })).query(async ({ input }) => {
    const user = await getUserById(input.userId);
    if (!user) throw new TRPCError7({ code: "NOT_FOUND" });
    const apis = await getExchangeApisByUserId(input.userId);
    const teamStats = await getTeamStats(input.userId);
    return {
      ...user,
      apis: apis.map((a) => ({ ...a, apiKeyEncrypted: "****", secretKeyEncrypted: "****", passphraseEncrypted: a.passphraseEncrypted ? "****" : null })),
      teamStats
    };
  }),
  adminGetInvitees: adminProcedure.input(z7.object({ userId: z7.number() })).query(async ({ input }) => {
    return getMyInvitees(input.userId);
  }),
  adminToggleUser: adminProcedure.input(z7.object({ userId: z7.number(), isActive: z7.boolean() })).mutation(async ({ input }) => {
    await updateUser(input.userId, { isActive: input.isActive });
    return { success: true };
  }),
  adminSetRevenueShareRatio: adminProcedure.input(z7.object({
    userId: z7.number(),
    ratio: z7.number().min(0).max(70)
  })).mutation(async ({ input }) => {
    if (input.ratio > 70) throw new TRPCError7({ code: "BAD_REQUEST", message: "\u5206\u6210\u6BD4\u4F8B\u4E0D\u80FD\u8D85\u8FC770%" });
    const user = await getUserById(input.userId);
    if (!user) throw new TRPCError7({ code: "NOT_FOUND" });
    await updateUser(input.userId, { revenueShareRatio: input.ratio.toFixed(2) });
    const invitees = await getMyInvitees(input.userId);
    for (const invitee of invitees) {
      const inviteeRatio = parseFloat(invitee.revenueShareRatio || "0");
      if (inviteeRatio < input.ratio) {
        await updateUser(invitee.id, { revenueShareRatio: input.ratio.toFixed(2) });
      }
    }
    return { success: true };
  }),
  adminRevenueShareRecords: adminProcedure.input(z7.object({ page: z7.number().default(1), limit: z7.number().default(20) })).query(async ({ input }) => {
    return listRevenueShareRecords(void 0, input.page, input.limit);
  }),
  // 搜索用户（支持ID、用户名、邮箱）
  adminSearchUsers: adminProcedure.input(z7.object({ keyword: z7.string(), page: z7.number().default(1), limit: z7.number().default(20) })).query(async ({ input }) => {
    const { items, total } = await searchUsers(input.keyword, input.page, input.limit);
    const enriched = await Promise.all(items.map(async (u) => {
      const apis = await getExchangeApisByUserId(u.id);
      return {
        ...u,
        hasExchangeApi: apis.length > 0,
        exchangeApiCount: apis.length,
        exchangeTypes: Array.from(new Set(apis.map((a) => a.exchange)))
      };
    }));
    return { items: enriched, total };
  }),
  // 查看指定用户的充值记录
  adminGetUserDeposits: adminProcedure.input(z7.object({ userId: z7.number(), page: z7.number().default(1), limit: z7.number().default(20) })).query(async ({ input }) => {
    return listDeposits(input.userId, input.page, input.limit);
  }),
  // 查看指定用户的提现记录
  adminGetUserWithdrawals: adminProcedure.input(z7.object({ userId: z7.number(), page: z7.number().default(1), limit: z7.number().default(20) })).query(async ({ input }) => {
    return listWithdrawals(input.userId, input.page, input.limit);
  }),
  // 查看指定用户的资金流水（包含所有类型）
  adminGetUserFundTransactions: adminProcedure.input(z7.object({ userId: z7.number(), page: z7.number().default(1), limit: z7.number().default(20) })).query(async ({ input }) => {
    return listFundTransactions(input.userId, input.page, input.limit);
  }),
  // 查看指定用户的交易订单
  adminGetUserOrders: adminProcedure.input(z7.object({ userId: z7.number(), page: z7.number().default(1), limit: z7.number().default(20) })).query(async ({ input }) => {
    const [orders, stats] = await Promise.all([
      listCopyOrders(input.userId, input.page, input.limit),
      getUserOrderStats(input.userId)
    ]);
    return { ...orders, stats };
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: authRouter,
  exchange: exchangeRouter,
  strategy: strategyRouter,
  points: pointsRouter,
  funds: fundsRouter,
  user: userRouter
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT as SignJWT2, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT2({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import path from "path";
async function setupVite(app, server) {
  const { createServer: createViteServer } = await import("vite");
  const { nanoid } = await import("nanoid");
  const viteConfigPath = new URL("../../vite.config.ts", import.meta.url).href;
  const viteConfig = (await import(
    /* @vite-ignore */
    viteConfigPath
  )).default;
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    startAutoScan();
    startCopyEngine().catch((err) => console.error("[CopyEngine] Failed to start:", err.message));
  });
}
startServer().catch(console.error);
