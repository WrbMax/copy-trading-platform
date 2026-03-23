import {
  addFundTransaction,
  createRevenueShareRecords,
  getDb,
  getSystemConfig,
  getUserById,
  getUserReferralChain,
  updateCopyOrder,
  updateUser,
} from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Process revenue share for a closed profitable order.
 * Uses differential (差额) multi-level sharing.
 *
 * Example:
 *   A → B → C (trader)
 *   A's ratio for B = 10%, B's ratio for C = 30%
 *   C's profit = 100U
 *   → C deducted: 100 × 30% = 30U
 *   → B receives: 100 × (30% - 10%) = 20U
 *   → A receives: 100 × 10% = 10U
 */
export async function processRevenueShare(params: {
  copyOrderId: number;
  traderId: number;
  netPnl: number;
}): Promise<void> {
  const { copyOrderId, traderId, netPnl } = params;
  if (netPnl <= 0) return; // Only process profitable orders

  const trader = await getUserById(traderId);
  if (!trader) return;

  const traderRatio = parseFloat(trader.revenueShareRatio || "0");
  if (traderRatio <= 0) return; // No revenue share configured

  const totalDeducted = netPnl * (traderRatio / 100);
  if (totalDeducted <= 0) return;

  // Get the referral chain (parent, grandparent, ...)
  const chain = await getUserReferralChain(traderId);
  if (chain.length === 0) return;

  const records: Array<{
    copyOrderId: number;
    traderId: number;
    recipientId: number;
    level: number;
    traderPnl: string;
    ratio: string;
    amount: string;
  }> = [];

  let prevRatio = 0;
  for (let i = 0; i < chain.length; i++) {
    const ancestor = chain[i];
    const ancestorRatio = parseFloat(ancestor.revenueShareRatio || "0");
    if (ancestorRatio <= 0) continue;

    // Differential amount for this level
    const diff = ancestorRatio - prevRatio;
    if (diff <= 0) continue;

    const amount = netPnl * (diff / 100);
    if (amount <= 0) continue;

    records.push({
      copyOrderId,
      traderId,
      recipientId: ancestor.id,
      level: i + 1,
      traderPnl: netPnl.toFixed(8),
      ratio: diff.toFixed(2),
      amount: amount.toFixed(8),
    });

    // Credit the ancestor's balance
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
        note: `来自用户 #${traderId} 的收益分成`,
      });
    }

    prevRatio = ancestorRatio;
    if (prevRatio >= traderRatio) break;
  }

  if (records.length > 0) {
    await createRevenueShareRecords(records as any);
  }

  // Deduct from trader's balance
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
      note: `收益分成扣减`,
    });
    await updateCopyOrder(copyOrderId, { revenueShareDeducted: totalDeducted.toFixed(8) });
  }
}
