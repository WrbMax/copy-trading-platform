import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addFundTransaction,
  createDeposit,
  createWithdrawal,
  getSystemConfig,
  getUserById,
  listDeposits,
  listFundTransactions,
  listWithdrawals,
  setSystemConfig,
  listSystemConfig,
  updateDeposit,
  updateUser,
  updateWithdrawal,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { adminProcedure } from "../_core/trpc";

export const fundsRouter = router({
  myBalance: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    return { balance: user?.balance ?? "0" };
  }),

  depositAddress: protectedProcedure.query(async () => {
    const addr = await getSystemConfig("platform_deposit_address");
    return { address: addr ?? "请联系管理员获取充值地址", network: "BSC (BEP-20)" };
  }),

  submitDeposit: protectedProcedure
    .input(z.object({
      amount: z.number().positive(),
      txHash: z.string().optional(),
      fromAddress: z.string().optional(),
      proofNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const addr = await getSystemConfig("platform_deposit_address");
      await createDeposit({
        userId: ctx.user.id,
        amount: input.amount.toFixed(8),
        txHash: input.txHash,
        fromAddress: input.fromAddress,
        toAddress: addr ?? "",
        proofNote: input.proofNote,
      });
      return { success: true };
    }),

  submitWithdrawal: protectedProcedure
    .input(z.object({
      amount: z.number().positive(),
      toAddress: z.string().min(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const minAmount = parseFloat((await getSystemConfig("withdrawal_min_amount")) ?? "10");
      if (input.amount < minAmount) throw new TRPCError({ code: "BAD_REQUEST", message: `最低提现金额为 ${minAmount} USDT` });

      const feeRate = parseFloat((await getSystemConfig("withdrawal_fee_rate")) ?? "0.01");
      const fee = input.amount * feeRate;
      const netAmount = input.amount - fee;
      const balance = parseFloat(user.balance || "0");
      if (balance < input.amount) throw new TRPCError({ code: "BAD_REQUEST", message: "余额不足" });

      // Freeze balance
      const newBalance = balance - input.amount;
      await updateUser(ctx.user.id, { balance: newBalance.toFixed(8) });
      await createWithdrawal({
        userId: ctx.user.id,
        amount: input.amount.toFixed(8),
        fee: fee.toFixed(8),
        netAmount: netAmount.toFixed(8),
        toAddress: input.toAddress,
        network: "BSC",
      });
      await addFundTransaction({
        userId: ctx.user.id,
        type: "withdrawal",
        amount: (-input.amount).toFixed(8),
        balanceAfter: newBalance.toFixed(8),
        note: `提现申请 ${input.amount} USDT`,
      });
      return { success: true };
    }),

  myDeposits: protectedProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      return listDeposits(ctx.user.id, input.page, input.limit);
    }),

  myWithdrawals: protectedProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      return listWithdrawals(ctx.user.id, input.page, input.limit);
    }),

  myTransactions: protectedProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      return listFundTransactions(ctx.user.id, input.page, input.limit);
    }),

  // Admin
  adminDeposits: adminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      return listDeposits(undefined, input.page, input.limit);
    }),

  adminWithdrawals: adminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      return listWithdrawals(undefined, input.page, input.limit);
    }),

  adminAllTransactions: adminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      return listFundTransactions(undefined, input.page, input.limit);
    }),

  adminReviewDeposit: adminProcedure
    .input(z.object({
      depositId: z.number(),
      approved: z.boolean(),
      reviewNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const deposit = (await listDeposits(undefined, 1, 10000)).items.find((d) => d.id === input.depositId);
      if (!deposit) throw new TRPCError({ code: "NOT_FOUND" });
      if (deposit.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "该申请已处理" });

      await updateDeposit(input.depositId, {
        status: input.approved ? "approved" : "rejected",
        reviewedBy: ctx.user.id,
        reviewNote: input.reviewNote,
        reviewedAt: new Date(),
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
            note: `充值审核通过`,
          });
        }
      }
      return { success: true };
    }),

  adminReviewWithdrawal: adminProcedure
    .input(z.object({
      withdrawalId: z.number(),
      approved: z.boolean(),
      txHash: z.string().optional(),
      reviewNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const withdrawal = (await listWithdrawals(undefined, 1, 10000)).items.find((w) => w.id === input.withdrawalId);
      if (!withdrawal) throw new TRPCError({ code: "NOT_FOUND" });
      if (withdrawal.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "该申请已处理" });

      if (input.approved) {
        await updateWithdrawal(input.withdrawalId, {
          status: "completed",
          txHash: input.txHash,
          reviewedBy: ctx.user.id,
          reviewNote: input.reviewNote,
          reviewedAt: new Date(),
        });
      } else {
        // Refund balance on rejection
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
            note: `提现申请被拒绝，退款`,
          });
        }
        await updateWithdrawal(input.withdrawalId, {
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewNote: input.reviewNote,
          reviewedAt: new Date(),
        });
      }
      return { success: true };
    }),

  adminGetConfig: adminProcedure.query(async () => {
    return listSystemConfig();
  }),

  adminSetConfig: adminProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      await setSystemConfig(input.key, input.value);
      return { success: true };
    }),
});
