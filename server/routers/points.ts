import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addPointsTransaction,
  getUserById,
  getUserByInviteCode,
  getUserOrderStats,
  listPointsTransactions,
  listAllPointsTransactions,
  updateUser,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { adminProcedure } from "../_core/trpc";

const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;

export const pointsRouter = router({
  myBalance: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    return { points: user?.points ?? 0 };
  }),

  myTransactions: protectedProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      return listPointsTransactions(ctx.user.id, input.page, input.limit);
    }),

  redeem: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });

    // Check net loss
    const stats = await getUserOrderStats(ctx.user.id);
    const netPnl = stats.netPnl;
    if (netPnl >= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "当前无净亏损，无法兑换积分" });

    // Check 30-day limit: use lastPointsRedeemMonth as ISO date string (we'll store full timestamp)
    if (user.lastPointsRedeemMonth) {
      const lastRedeemTime = new Date(user.lastPointsRedeemMonth).getTime();
      const now = Date.now();
      const diffMs = now - lastRedeemTime;
      if (diffMs < MS_30_DAYS) {
        const daysLeft = Math.ceil((MS_30_DAYS - diffMs) / (24 * 60 * 60 * 1000));
        throw new TRPCError({ code: "BAD_REQUEST", message: `距上次兑换不足30天，还需等待 ${daysLeft} 天` });
      }
    }

    const redeemAmount = Math.floor(Math.abs(netPnl)); // 1U = 1 point
    if (redeemAmount <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "可兑换积分数量不足" });

    const now = new Date();
    const nowIso = now.toISOString();
    const newPoints = (user.points ?? 0) + redeemAmount;
    await updateUser(ctx.user.id, {
      points: newPoints,
      lastPointsRedeemMonth: nowIso, // store full ISO timestamp for 30-day check
      totalLoss: "0",
      totalProfit: "0",
    });
    await addPointsTransaction({
      userId: ctx.user.id,
      type: "redeem",
      amount: redeemAmount,
      balanceAfter: newPoints,
      redeemMonth: nowIso.slice(0, 7),
      note: `净亏损兑换积分 ${redeemAmount} 积分`,
    });
    return { success: true, pointsAdded: redeemAmount, newBalance: newPoints };
  }),

  // Transfer by invite code (more user-friendly than numeric userId)
  transfer: protectedProcedure
    .input(z.object({
      toInviteCode: z.string().min(1),
      amount: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const sender = await getUserById(ctx.user.id);
      if (!sender) throw new TRPCError({ code: "NOT_FOUND" });

      // Find receiver by invite code
      const receiver = await getUserByInviteCode(input.toInviteCode.trim());
      if (!receiver) throw new TRPCError({ code: "NOT_FOUND", message: "未找到该邀请码对应的用户" });
      if (receiver.id === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能转给自己" });
      if ((sender.points ?? 0) < input.amount) throw new TRPCError({ code: "BAD_REQUEST", message: "积分余额不足" });

      const senderNew = (sender.points ?? 0) - input.amount;
      const receiverNew = (receiver.points ?? 0) + input.amount;

      await updateUser(ctx.user.id, { points: senderNew });
      await updateUser(receiver.id, { points: receiverNew });

      await addPointsTransaction({
        userId: ctx.user.id, type: "transfer_out", amount: -input.amount, balanceAfter: senderNew,
        relatedUserId: receiver.id, note: `转出积分给 ${receiver.name || receiver.email}（邀请码 ${input.toInviteCode}）`,
      });
      await addPointsTransaction({
        userId: receiver.id, type: "transfer_in", amount: input.amount, balanceAfter: receiverNew,
        relatedUserId: ctx.user.id, note: `收到来自 ${sender.name || sender.email} 的积分`,
      });

      return { success: true, receiverName: receiver.name || receiver.email };
    }),

  adminAdjust: adminProcedure
    .input(z.object({
      userId: z.number(),
      amount: z.number().int(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const newPoints = Math.max(0, (user.points ?? 0) + input.amount);
      await updateUser(input.userId, { points: newPoints });
      await addPointsTransaction({
        userId: input.userId,
        type: input.amount > 0 ? "admin_add" : "admin_deduct",
        amount: input.amount,
        balanceAfter: newPoints,
        note: input.note ?? (input.amount > 0 ? "管理员增加积分" : "管理员扣减积分"),
      });
      return { success: true, newBalance: newPoints };
    }),

  adminAllTransactions: adminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      return listAllPointsTransactions(input.page, input.limit);
    }),
});
