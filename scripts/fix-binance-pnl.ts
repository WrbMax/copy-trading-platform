/**
 * 历史数据修正脚本：修正币安订单的 realizedPnl 数据
 *
 * 问题：之前使用 /fapi/v1/userTrades 接口的 realizedPnl 字段，
 *       该接口按 FIFO 计算整个仓位盈亏，导致数据高估。
 *
 * 修正方案：对已有的 closed 状态的币安 open_long/open_short 订单，
 *           用 openPrice 和 closePrice 重新计算 realizedPnl 和 netPnl。
 *
 * 运行方式（在服务器 /www/wwwroot/copy-trading 目录下）：
 *   npx tsx scripts/fix-binance-pnl.ts [--dry-run] [--user-id=976]
 *
 * 参数说明：
 *   --dry-run    仅打印将要修改的数据，不实际写入数据库
 *   --user-id=N  只修正指定用户ID的数据（不指定则修正所有币安用户）
 */

import { drizzle } from "drizzle-orm/mysql2";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { copyOrders } from "../drizzle/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL 环境变量未设置");
  process.exit(1);
}

const isDryRun = process.argv.includes("--dry-run");
const userIdArg = process.argv.find(a => a.startsWith("--user-id="));
const filterUserId = userIdArg ? parseInt(userIdArg.split("=")[1]) : null;

const db = drizzle(DATABASE_URL);

async function main() {
  console.log(`\n🔧 币安历史订单 PnL 修正脚本`);
  console.log(`   模式: ${isDryRun ? "DRY RUN（仅预览，不写入）" : "实际修正"}`);
  if (filterUserId) console.log(`   用户ID过滤: ${filterUserId}`);
  console.log("");

  // 查询所有需要修正的币安 open_long/open_short 订单
  // 条件：exchange=binance, status=closed, openPrice 和 closePrice 都不为空
  const conditions = [
    eq(copyOrders.exchange, "binance"),
    eq(copyOrders.status, "closed"),
    isNotNull(copyOrders.openPrice),
    isNotNull(copyOrders.closePrice),
    // 只处理开仓订单（open_long/open_short），这些是记录盈亏的订单
    sql`${copyOrders.action} IN ('open_long', 'open_short')`,
  ];

  if (filterUserId) {
    conditions.push(eq(copyOrders.userId, filterUserId));
  }

  const orders = await db.select().from(copyOrders).where(and(...conditions));

  console.log(`📊 找到 ${orders.length} 条需要检查的币安订单\n`);

  let fixedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const order of orders) {
    const openPrice = parseFloat(order.openPrice || "0");
    const closePrice = parseFloat(order.closePrice || "0");
    const qty = parseFloat(order.actualQuantity || "0");
    const fee = parseFloat(order.fee || "0");
    const oldRealizedPnl = parseFloat(order.realizedPnl || "0");
    const oldNetPnl = parseFloat(order.netPnl || "0");

    if (openPrice <= 0 || closePrice <= 0 || qty <= 0) {
      console.log(`⚠️  订单 #${order.id} (用户${order.userId}): 价格或数量为0，跳过`);
      skippedCount++;
      continue;
    }

    // 计算正确的 realizedPnl
    const isLong = order.action === "open_long";
    const newRealizedPnl = isLong
      ? (closePrice - openPrice) * qty
      : (openPrice - closePrice) * qty;
    const newNetPnl = newRealizedPnl - fee;

    const pnlDiff = newRealizedPnl - oldRealizedPnl;

    // 如果差异小于 0.0001，认为数据已经正确，跳过
    if (Math.abs(pnlDiff) < 0.0001) {
      skippedCount++;
      continue;
    }

    console.log(`📝 订单 #${order.id} (用户${order.userId}, ${order.action}):`);
    console.log(`   openPrice=${openPrice}, closePrice=${closePrice}, qty=${qty}`);
    console.log(`   旧 realizedPnl=${oldRealizedPnl.toFixed(6)}, 新 realizedPnl=${newRealizedPnl.toFixed(6)} (差值: ${pnlDiff > 0 ? "+" : ""}${pnlDiff.toFixed(6)})`);
    console.log(`   旧 netPnl=${oldNetPnl.toFixed(6)}, 新 netPnl=${newNetPnl.toFixed(6)}`);

    if (!isDryRun) {
      try {
        await db.update(copyOrders).set({
          realizedPnl: newRealizedPnl.toFixed(8),
          netPnl: newNetPnl.toFixed(8),
        }).where(eq(copyOrders.id, order.id));
        console.log(`   ✅ 已更新`);
        fixedCount++;
      } catch (e) {
        console.error(`   ❌ 更新失败: ${e}`);
        errorCount++;
      }
    } else {
      fixedCount++;
    }
  }

  console.log(`\n📈 修正结果汇总:`);
  console.log(`   需要修正: ${fixedCount} 条`);
  console.log(`   已跳过（数据正确或价格缺失）: ${skippedCount} 条`);
  if (!isDryRun) {
    console.log(`   更新失败: ${errorCount} 条`);
  }

  if (isDryRun) {
    console.log(`\n⚠️  DRY RUN 模式，未实际写入数据库。去掉 --dry-run 参数后重新运行以实际修正。`);
  } else {
    console.log(`\n✅ 修正完成！`);
  }

  process.exit(0);
}

main().catch(e => {
  console.error("❌ 脚本执行失败:", e);
  process.exit(1);
});
