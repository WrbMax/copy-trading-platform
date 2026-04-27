import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getAdminDashboardStats,
  getExchangeApisByUserId,
  getMyInvitees,
  getUserById,
  listUsers,
  searchUsers,
  updateUser,
  listCopyOrders,
  getUserOrderStats,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { adminProcedure } from "../_core/trpc";

export const userRouter = router({
  profile: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      inviteCode: user.inviteCode,
      totalProfit: user.totalProfit,
      totalLoss: user.totalLoss,
      role: user.role,
      createdAt: user.createdAt,
    };
  }),

  // Admin
  adminDashboard: adminProcedure.query(async () => {
    return getAdminDashboardStats();
  }),

  adminList: adminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const { items, total } = await listUsers(input.page, input.limit);
      const enriched = await Promise.all(items.map(async (u) => {
        const apis = await getExchangeApisByUserId(u.id);
        return {
          ...u,
          hasExchangeApi: apis.length > 0,
          exchangeApiCount: apis.length,
          exchangeTypes: Array.from(new Set(apis.map((a) => a.exchange))),
        };
      }));
      return { items: enriched, total };
    }),

  adminSearch: adminProcedure
    .input(z.object({ keyword: z.string(), page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const { items, total } = await searchUsers(input.keyword, input.page, input.limit);
      const enriched = await Promise.all(items.map(async (u) => {
        const apis = await getExchangeApisByUserId(u.id);
        return {
          ...u,
          hasExchangeApi: apis.length > 0,
          exchangeApiCount: apis.length,
          exchangeTypes: Array.from(new Set(apis.map((a) => a.exchange))),
        };
      }));
      return { items: enriched, total };
    }),

  adminGetUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const apis = await getExchangeApisByUserId(input.userId);
      return {
        ...user,
        apis: apis.map((a) => ({ ...a, apiKeyEncrypted: "****", secretKeyEncrypted: "****", passphraseEncrypted: a.passphraseEncrypted ? "****" : null })),
      };
    }),

  adminGetInvitees: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return getMyInvitees(input.userId);
    }),

  adminToggleUser: adminProcedure
    .input(z.object({ userId: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      await updateUser(input.userId, { isActive: input.isActive });
      return { success: true };
    }),

  adminGetUserOrders: adminProcedure
    .input(z.object({ userId: z.number(), page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const { items, total } = await listCopyOrders(input.userId, input.page, input.limit);
      const stats = await getUserOrderStats(input.userId);
      return { items, total, stats };
    }),
});
