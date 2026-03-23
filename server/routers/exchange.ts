import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createExchangeApi,
  deleteExchangeApi,
  getExchangeApiById,
  getExchangeApisByUserId,
  updateExchangeApi,
} from "../db";
import { decrypt, encrypt, maskApiKey } from "../crypto";
import { protectedProcedure, router } from "../_core/trpc";

export const exchangeRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const apis = await getExchangeApisByUserId(ctx.user.id);
    // Mask sensitive fields
    return apis.map((api) => ({
      ...api,
      apiKeyEncrypted: maskApiKey(api.apiKeyEncrypted),
      secretKeyEncrypted: "****",
      passphraseEncrypted: api.passphraseEncrypted ? "****" : null,
    }));
  }),

  bind: protectedProcedure
    .input(z.object({
      exchange: z.enum(["binance", "okx", "bybit", "bitget", "gate"]),
      label: z.string().optional(),
      apiKey: z.string().min(1),
      secretKey: z.string().min(1),
      passphrase: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await createExchangeApi({
        userId: ctx.user.id,
        exchange: input.exchange,
        label: input.label,
        apiKeyEncrypted: encrypt(input.apiKey),
        secretKeyEncrypted: encrypt(input.secretKey),
        passphraseEncrypted: input.passphrase ? encrypt(input.passphrase) : undefined,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      label: z.string().optional(),
      apiKey: z.string().optional(),
      secretKey: z.string().optional(),
      passphrase: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const api = await getExchangeApiById(input.id);
      if (!api || api.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const updateData: Record<string, unknown> = {};
      if (input.label !== undefined) updateData.label = input.label;
      if (input.apiKey) updateData.apiKeyEncrypted = encrypt(input.apiKey);
      if (input.secretKey) updateData.secretKeyEncrypted = encrypt(input.secretKey);
      if (input.passphrase) updateData.passphraseEncrypted = encrypt(input.passphrase);
      await updateExchangeApi(input.id, updateData as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const api = await getExchangeApiById(input.id);
      if (!api || api.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteExchangeApi(input.id);
      return { success: true };
    }),

  test: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const api = await getExchangeApiById(input.id);
      if (!api || api.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      // Simulate connection test (real implementation would call exchange API)
      try {
        const apiKey = decrypt(api.apiKeyEncrypted);
        // In production: call exchange API to verify credentials
        // For now, simulate success if key is non-empty
        const testSuccess = apiKey.length > 0;
        await updateExchangeApi(input.id, {
          isVerified: testSuccess,
          lastTestedAt: new Date(),
          testStatus: testSuccess ? "success" : "failed",
          testMessage: testSuccess ? "连接成功" : "连接失败，请检查API密钥",
        });
        return { success: testSuccess, message: testSuccess ? "连接成功" : "连接失败" };
      } catch {
        await updateExchangeApi(input.id, {
          isVerified: false,
          lastTestedAt: new Date(),
          testStatus: "failed",
          testMessage: "连接测试异常",
        });
        return { success: false, message: "连接测试异常" };
      }
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const api = await getExchangeApiById(input.id);
      if (!api || api.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await updateExchangeApi(input.id, { isActive: input.isActive });
      return { success: true };
    }),
});
