import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addPointsTransaction,
  getUserById,
  getUserOrderStats,
  listPointsTransactions,
  listAllPointsTransactions,
  updateUser,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { adminProcedure } from "../_core/trpc";

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

    // Check monthly limit
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (user.lastPointsRedeemMonth === currentMonth) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "本月已兑换过积分，每月仅限一次" });
    }

    const redeemAmount = Math.floor(Math.abs(netPnl)); // 1U = 1 point
    if (redeemAmount <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "可兑换积分数量不足" });

    const newPoints = (user.points ?? 0) + redeemAmount;
    await updateUser(ctx.user.id, {
      points: newPoints,
      lastPointsRedeemMonth: currentMonth,
      // Reset loss tracking after redemption
      totalLoss: "0",
      totalProfit: "0",
    });
    await addPointsTransaction({
      userId: ctx.user.id,
      type: "redeem",
      amount: redeemAmount,
      balanceAfter: newPoints,
      redeemMonth: currentMonth,
      note: `净亏损兑换积分 ${redeemAmount} 积分`,
    });
    return { success: true, pointsAdded: redeemAmount, newBalance: newPoints };
  }),

  transfer: protectedProcedure
    .input(z.object({
      toUserId: z.number(),
      amount: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.toUserId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能转给自己" });
      const sender = await getUserById(ctx.user.id);
      if (!sender) throw new TRPCError({ code: "NOT_FOUND" });
      if ((sender.points ?? 0) < input.amount) throw new TRPCError({ code: "BAD_REQUEST", message: "积分余额不足" });
      const receiver = await getUserById(input.toUserId);
      if (!receiver) throw new TRPCError({ code: "NOT_FOUND", message: "目标用户不存在" });

      const senderNew = (sender.points ?? 0) - input.amount;
      const receiverNew = (receiver.points ?? 0) + input.amount;

      await updateUser(ctx.user.id, { points: senderNew });
      await updateUser(input.toUserId, { points: receiverNew });

      await addPointsTransaction({ userId: ctx.user.id, type: "transfer_out", amount: -input.amount, balanceAfter: senderNew, relatedUserId: input.toUserId, note: `转出积分给用户 #${input.toUserId}` });
      await addPointsTransaction({ userId: input.toUserId, type: "transfer_in", amount: input.amount, balanceAfter: receiverNew, relatedUserId: ctx.user.id, note: `收到来自用户 #${ctx.user.id} 的积分` });

      return { success: true };
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
