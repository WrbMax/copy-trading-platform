#!/usr/bin/env node
/**
 * Reconciliation script for user Linna (userId=303)
 * 
 * This script:
 * 1. Reads all open_long orders that are still "open" in the database
 * 2. Queries Binance API using the exchangeOrderId to check if the order has been filled/closed
 * 3. Fetches all userTrades for that order to get real realizedPnl and commission
 * 4. Updates the database with accurate PnL data
 * 
 * Run on the server: node /tmp/reconcile_linna.mjs
 */

import crypto from 'crypto';
import mysql from 'mysql2/promise';

// ─── Config ──────────────────────────────────────────────────────────────────
const DB_URL = 'mysql://copytrader:CopyTrade2024!@localhost:3306/copy_trading';
const JWT_SECRET = 'copy-trading-jwt-secret-2024-xgjdmy-secure';
const USER_ID = 303;

// ─── Crypto (decrypt API keys) ───────────────────────────────────────────────
function decrypt(encryptedText) {
  const key = crypto.scryptSync(JWT_SECRET, 'copy-trading-salt', 32);
  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');
  const [ivHex, tagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

// ─── Binance API ─────────────────────────────────────────────────────────────
function sign(secretKey, queryString) {
  return crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
}

async function binanceRequest(creds, method, path, params = {}) {
  const timestamp = Date.now();
  const allParams = { ...params, timestamp };
  const queryString = Object.entries(allParams)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  const signature = sign(creds.secretKey, queryString);
  const fullQuery = `${queryString}&signature=${signature}`;
  const url = `https://fapi.binance.com${path}?${fullQuery}`;

  const res = await fetch(url, {
    method,
    headers: { 'X-MBX-APIKEY': creds.apiKey },
  });
  const text = await res.text();
  // Preserve big integer orderId precision
  const safeText = text.replace(/"orderId"\s*:\s*(\d{15,})/g, '"orderId":"$1"');
  return JSON.parse(safeText);
}

async function getBinanceOrderStatus(creds, symbol, orderId) {
  return binanceRequest(creds, 'GET', '/fapi/v1/order', { symbol, orderId });
}

async function getBinanceUserTrades(creds, symbol, orderId) {
  return binanceRequest(creds, 'GET', '/fapi/v1/userTrades', { symbol, orderId, limit: 100 });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // Connect to database
  const connection = await mysql.createConnection(DB_URL);
  console.log('Connected to database');

  // Get Linna's Binance API credentials
  const [apis] = await connection.execute(
    'SELECT id, apiKeyEncrypted, secretKeyEncrypted FROM exchange_apis WHERE userId = ? AND exchange = "binance" AND isActive = 1',
    [USER_ID]
  );
  if (apis.length === 0) {
    console.error('No active Binance API found for user', USER_ID);
    process.exit(1);
  }
  const api = apis[0];
  const creds = {
    apiKey: decrypt(api.apiKeyEncrypted),
    secretKey: decrypt(api.secretKeyEncrypted),
  };
  console.log('Decrypted API credentials');

  // Get all open_long orders that are still "open"
  const [openOrders] = await connection.execute(
    'SELECT id, symbol, exchangeOrderId, actualQuantity, openPrice, status FROM copy_orders WHERE userId = ? AND action = "open_long" AND status = "open" AND exchangeOrderId IS NOT NULL',
    [USER_ID]
  );
  console.log(`Found ${openOrders.length} open orders to reconcile`);

  // Also get all closed open_long orders to re-verify their PnL
  const [closedOrders] = await connection.execute(
    'SELECT id, symbol, exchangeOrderId, closeOrderId, actualQuantity, openPrice, closePrice, realizedPnl, fee, netPnl, status FROM copy_orders WHERE userId = ? AND action = "open_long" AND status = "closed"',
    [USER_ID]
  );
  console.log(`Found ${closedOrders.length} closed orders to verify PnL`);

  let totalUpdated = 0;
  let totalNewPnl = 0;
  let totalOldPnl = 0;

  // ─── Process OPEN orders ──────────────────────────────────────────────────
  console.log('\n=== Processing OPEN orders ===');
  for (const order of openOrders) {
    const symbol = 'ETHUSDT'; // All orders are ETH-USDT-SWAP → ETHUSDT
    const orderId = order.exchangeOrderId;

    try {
      // Check order status on Binance
      const orderDetail = await getBinanceOrderStatus(creds, symbol, orderId);
      console.log(`Order ${order.id} (binance: ${orderId}): status=${orderDetail.status}, executedQty=${orderDetail.executedQty}`);

      if (orderDetail.status === 'FILLED' || orderDetail.status === 'PARTIALLY_FILLED') {
        // Order was filled on Binance - get the trades to find realizedPnl
        const trades = await getBinanceUserTrades(creds, symbol, orderId);
        
        let totalRealizedPnl = 0;
        let totalCommission = 0;
        for (const trade of trades) {
          totalRealizedPnl += parseFloat(trade.realizedPnl || '0');
          totalCommission += parseFloat(trade.commission || '0');
        }
        
        const netPnl = totalRealizedPnl - totalCommission;
        const avgPrice = parseFloat(orderDetail.avgPrice) || 0;

        console.log(`  → realizedPnl=${totalRealizedPnl.toFixed(6)}, commission=${totalCommission.toFixed(6)}, netPnl=${netPnl.toFixed(6)}`);

        // Note: For open orders, the realizedPnl from the OPEN trade is usually 0
        // (PnL is only realized on close). So we need to check if there's a corresponding
        // close trade. But since these orders were never matched to a close signal,
        // they might still be open positions on Binance.
        
        if (totalRealizedPnl !== 0) {
          // This open order has realized PnL (unusual - might mean it was partially closed)
          await connection.execute(
            'UPDATE copy_orders SET realizedPnl = ?, fee = ?, netPnl = ?, closePrice = ?, closeTime = NOW(), status = "closed" WHERE id = ?',
            [totalRealizedPnl.toFixed(8), totalCommission.toFixed(8), netPnl.toFixed(8), avgPrice.toFixed(8), order.id]
          );
          totalUpdated++;
          totalNewPnl += netPnl;
          console.log(`  ✅ Updated order ${order.id} to closed with netPnl=${netPnl.toFixed(6)}`);
        } else {
          console.log(`  ℹ️ Order ${order.id} is filled but realizedPnl=0 (open trade, no close yet)`);
        }
      } else if (orderDetail.status === 'NEW') {
        console.log(`  ℹ️ Order ${order.id} is still NEW on Binance (not yet filled)`);
      } else {
        console.log(`  ⚠️ Order ${order.id} has unexpected status: ${orderDetail.status}`);
      }

      // Rate limit: wait 200ms between API calls
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`  ❌ Error processing order ${order.id}: ${err.message}`);
    }
  }

  // ─── Verify CLOSED orders' PnL ───────────────────────────────────────────
  console.log('\n=== Verifying CLOSED orders PnL ===');
  let pnlMismatchCount = 0;
  
  for (const order of closedOrders) {
    const symbol = 'ETHUSDT';
    
    try {
      // For closed orders, we need to check the CLOSE order (closeOrderId) for real PnL
      const closeOrderId = order.closeOrderId;
      if (!closeOrderId) {
        console.log(`Order ${order.id}: no closeOrderId, skipping PnL verification`);
        continue;
      }

      // Get trades for the close order
      const trades = await getBinanceUserTrades(creds, symbol, closeOrderId);
      
      let realPnl = 0;
      let realFee = 0;
      for (const trade of trades) {
        realPnl += parseFloat(trade.realizedPnl || '0');
        realFee += parseFloat(trade.commission || '0');
      }
      const realNetPnl = realPnl - realFee;

      const dbPnl = parseFloat(order.realizedPnl || '0');
      const dbFee = parseFloat(order.fee || '0');
      const dbNetPnl = parseFloat(order.netPnl || '0');

      const pnlDiff = Math.abs(realPnl - dbPnl);
      const feeDiff = Math.abs(realFee - dbFee);

      if (pnlDiff > 0.001 || feeDiff > 0.001) {
        pnlMismatchCount++;
        console.log(`Order ${order.id}: PnL MISMATCH!`);
        console.log(`  DB:      realizedPnl=${dbPnl.toFixed(6)}, fee=${dbFee.toFixed(6)}, netPnl=${dbNetPnl.toFixed(6)}`);
        console.log(`  Binance: realizedPnl=${realPnl.toFixed(6)}, fee=${realFee.toFixed(6)}, netPnl=${realNetPnl.toFixed(6)}`);
        console.log(`  Diff:    pnl=${(realPnl - dbPnl).toFixed(6)}, fee=${(realFee - dbFee).toFixed(6)}`);

        // Update with real data
        const closeDetail = await getBinanceOrderStatus(creds, symbol, closeOrderId);
        const closePrice = parseFloat(closeDetail.avgPrice) || parseFloat(order.closePrice || '0');

        await connection.execute(
          'UPDATE copy_orders SET realizedPnl = ?, fee = ?, netPnl = ?, closePrice = ? WHERE id = ?',
          [realPnl.toFixed(8), realFee.toFixed(8), realNetPnl.toFixed(8), closePrice.toFixed(8), order.id]
        );
        totalUpdated++;
        totalOldPnl += dbNetPnl;
        totalNewPnl += realNetPnl;
        console.log(`  ✅ Updated order ${order.id}`);
      } else {
        totalOldPnl += dbNetPnl;
        totalNewPnl += dbNetPnl; // Same, no change
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`  ❌ Error verifying order ${order.id}: ${err.message}`);
      totalOldPnl += parseFloat(order.netPnl || '0');
      totalNewPnl += parseFloat(order.netPnl || '0');
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n=== RECONCILIATION SUMMARY ===');
  console.log(`Total orders updated: ${totalUpdated}`);
  console.log(`PnL mismatches found: ${pnlMismatchCount}`);
  console.log(`Old total netPnl: ${totalOldPnl.toFixed(6)}`);
  console.log(`New total netPnl: ${totalNewPnl.toFixed(6)}`);
  console.log(`Difference: ${(totalNewPnl - totalOldPnl).toFixed(6)}`);

  // Verify final stats
  const [finalStats] = await connection.execute(
    `SELECT 
      SUM(CASE WHEN netPnl > 0 THEN netPnl ELSE 0 END) as totalProfit,
      SUM(CASE WHEN netPnl < 0 THEN ABS(netPnl) ELSE 0 END) as totalLoss,
      SUM(COALESCE(netPnl, 0)) as netPnl,
      COUNT(*) as totalOrders,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as openOrders
    FROM copy_orders 
    WHERE userId = ? AND action IN ('open_long', 'open_short') AND status != 'cancelled'`,
    [USER_ID]
  );
  console.log('\n=== FINAL DB STATS (after reconciliation) ===');
  console.log(`Total Profit: ${parseFloat(finalStats[0].totalProfit || 0).toFixed(4)}`);
  console.log(`Total Loss: ${parseFloat(finalStats[0].totalLoss || 0).toFixed(4)}`);
  console.log(`Net PnL: ${parseFloat(finalStats[0].netPnl || 0).toFixed(4)}`);
  console.log(`Total Orders: ${finalStats[0].totalOrders}`);
  console.log(`Open Orders: ${finalStats[0].openOrders}`);

  await connection.end();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
