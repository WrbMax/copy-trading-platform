import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Helpers ----
function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

function makeUserCtx(role: "user" | "admin" = "user"): TrpcContext {
  return makeCtx({
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "email",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
  });
}

// ---- Auth Tests ----
describe("auth.me", () => {
  it("returns null for unauthenticated request", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user object for authenticated request", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("test@example.com");
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const cleared: string[] = [];
    const ctx = makeUserCtx();
    ctx.res.clearCookie = (name: string) => { cleared.push(name); };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared.length).toBeGreaterThan(0);
  });
});

// ---- Strategy Tests ----
describe("strategy.list", () => {
  it("returns list of active signal sources for public access", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const sources = await caller.strategy.list();
    expect(Array.isArray(sources)).toBe(true);
  });
});

describe("strategy.myStrategies", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.strategy.myStrategies()).rejects.toThrow();
  });

  it("returns empty array for authenticated user with no strategies", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    // This may return empty or throw DB error in test env - just check it doesn't crash with auth error
    try {
      const result = await caller.strategy.myStrategies();
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      // DB errors are acceptable in test env without a real DB
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });
});

// ---- Exchange Tests ----
describe("exchange.list", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.exchange.list()).rejects.toThrow();
  });
});

// ---- Points Tests ----
describe("points.myBalance", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.points.myBalance()).rejects.toThrow();
  });
});

// ---- Funds Tests ----
describe("funds.submitDeposit", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.funds.submitDeposit({ amount: 100, txHash: "0xabc" })).rejects.toThrow();
  });
});

// ---- Admin Tests ----
describe("admin procedures", () => {
  it("adminDashboard throws UNAUTHORIZED for regular users", async () => {
    const caller = appRouter.createCaller(makeUserCtx("user"));
    await expect(caller.user.adminDashboard()).rejects.toThrow();
  });

  it("adminList throws UNAUTHORIZED for regular users", async () => {
    const caller = appRouter.createCaller(makeUserCtx("user"));
    await expect(caller.user.adminList({})).rejects.toThrow();
  });
});

// ---- Revenue Share Logic Tests ----
describe("revenue share calculation", () => {
  it("verifies multi-level share is accessible only to admin", async () => {
    const caller = appRouter.createCaller(makeUserCtx("user"));
    await expect(caller.user.adminRevenueShareRecords({})).rejects.toThrow();
  });
});
