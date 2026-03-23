/**
 * Binance USDT-M Futures REST client.
 * Supports placing and closing perpetual contract orders.
 */
import crypto from "crypto";

export interface BinanceCredentials {
  apiKey: string;
  secretKey: string;
}

const BASE_URL = "https://fapi.binance.com";

function sign(secretKey: string, queryString: string): string {
  return crypto.createHmac("sha256", secretKey).update(queryString).digest("hex");
}

async function binanceRequest<T>(
  creds: BinanceCredentials,
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Record<string, string | number | boolean> = {}
): Promise<T> {
  const timestamp = Date.now();
  const allParams = { ...params, timestamp };
  const queryString = Object.entries(allParams)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  const signature = sign(creds.secretKey, queryString);
  const fullQuery = `${queryString}&signature=${signature}`;

  const url =
    method === "GET" || method === "DELETE"
      ? `${BASE_URL}${path}?${fullQuery}`
      : `${BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "X-MBX-APIKEY": creds.apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "POST" ? fullQuery : undefined,
  });

  const data = (await res.json()) as T & { code?: number; msg?: string };
  if ((data as { code?: number }).code && (data as { code?: number }).code! < 0) {
    throw new Error(`Binance API error ${(data as { code?: number }).code}: ${(data as { msg?: string }).msg}`);
  }
  return data;
}

/**
 * Convert OKX instId (e.g. ETH-USDT-SWAP) to Binance symbol (e.g. ETHUSDT)
 */
export function toBinanceSymbol(instId: string): string {
  // ETH-USDT-SWAP → ETHUSDT
  const parts = instId.split("-");
  if (parts.length >= 2) {
    return parts[0] + parts[1];
  }
  return instId.replace(/-/g, "");
}

export interface BinanceOrderResult {
  orderId: number;
  symbol: string;
  status: string;
  side: string;
  positionSide: string;
  origQty: string;
  avgPrice: string;
}

/**
 * Set position mode to Hedge mode (required for long/short positions).
 * Silently ignores "already in this mode" error.
 */
export async function ensureHedgeMode(creds: BinanceCredentials): Promise<void> {
  try {
    await binanceRequest(creds, "POST", "/fapi/v1/positionSide/dual", { dualSidePosition: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // -4059 = No need to change position side
    if (!msg.includes("-4059") && !msg.includes("4059")) throw e;
  }
}

/**
 * Place a Binance futures order.
 * @param side "BUY" | "SELL"
 * @param positionSide "LONG" | "SHORT"
 * @param quantity contract quantity (in base asset, e.g. ETH amount)
 */
export async function placeBinanceOrder(
  creds: BinanceCredentials,
  instId: string,
  side: "BUY" | "SELL",
  positionSide: "LONG" | "SHORT",
  quantity: string
): Promise<BinanceOrderResult> {
  const symbol = toBinanceSymbol(instId);
  await ensureHedgeMode(creds);
  return binanceRequest<BinanceOrderResult>(creds, "POST", "/fapi/v1/order", {
    symbol,
    side,
    positionSide,
    type: "MARKET",
    quantity,
  });
}

/**
 * Close a Binance futures position.
 * side is the closing side: closing LONG = SELL, closing SHORT = BUY
 */
export async function closeBinancePosition(
  creds: BinanceCredentials,
  instId: string,
  positionSide: "LONG" | "SHORT",
  quantity: string
): Promise<BinanceOrderResult> {
  const side = positionSide === "LONG" ? "SELL" : "BUY";
  return placeBinanceOrder(creds, instId, side, positionSide, quantity);
}

/**
 * Get current futures positions for a symbol.
 */
export async function getBinancePositions(
  creds: BinanceCredentials,
  symbol?: string
): Promise<Array<{ symbol: string; positionSide: string; positionAmt: string; entryPrice: string; unrealizedProfit: string }>> {
  const params: Record<string, string> = {};
  if (symbol) params.symbol = symbol;
  const data = await binanceRequest<Array<{ symbol: string; positionSide: string; positionAmt: string; entryPrice: string; unrealizedProfit: string }>>(
    creds, "GET", "/fapi/v2/positionRisk", params
  );
  return data.filter((p) => parseFloat(p.positionAmt) !== 0);
}

/**
 * Get Binance futures account balance.
 */
export async function getBinanceBalance(
  creds: BinanceCredentials
): Promise<{ totalWalletBalance: string; availableBalance: string }> {
  const data = await binanceRequest<Array<{ asset: string; totalWalletBalance: string; availableBalance: string }>>(
    creds, "GET", "/fapi/v2/account", {}
  );
  // Return USDT balance
  const usdt = (data as unknown as { totalWalletBalance: string; availableBalance: string; assets?: Array<{ asset: string; walletBalance: string; availableBalance: string }> });
  if (usdt.totalWalletBalance) return { totalWalletBalance: usdt.totalWalletBalance, availableBalance: usdt.availableBalance };
  return { totalWalletBalance: "0", availableBalance: "0" };
}

/**
 * Get Binance futures instrument info (for contract size calculation).
 */
export async function getBinanceInstrument(
  symbol: string
): Promise<{ quantityPrecision: number; pricePrecision: number; minQty: string } | null> {
  try {
    const data = await fetch(`${BASE_URL}/fapi/v1/exchangeInfo`).then((r) => r.json()) as {
      symbols: Array<{ symbol: string; quantityPrecision: number; pricePrecision: number; filters: Array<{ filterType: string; minQty: string }> }>;
    };
    const info = data.symbols.find((s) => s.symbol === symbol);
    if (!info) return null;
    const lotFilter = info.filters.find((f) => f.filterType === "LOT_SIZE");
    return {
      quantityPrecision: info.quantityPrecision,
      pricePrecision: info.pricePrecision,
      minQty: lotFilter?.minQty ?? "0.001",
    };
  } catch {
    return null;
  }
}

/**
 * Calculate Binance order quantity from USDT amount.
 * For ETHUSDT: quantity is in ETH (not contracts like OKX).
 * OKX ETH-USDT-SWAP: 1 contract = 0.01 ETH (ctVal=0.01)
 * So to convert OKX contracts to Binance ETH quantity:
 *   binanceQty = okxContracts * ctVal (0.01) → but we need current price
 */
export function calcBinanceQty(
  okxContracts: number,
  okxCtVal: number, // OKX contract value in ETH (e.g. 0.01 for ETH-USDT-SWAP)
  quantityPrecision: number
): string {
  const ethAmount = okxContracts * okxCtVal;
  const factor = Math.pow(10, quantityPrecision);
  const rounded = Math.floor(ethAmount * factor) / factor;
  return rounded.toFixed(quantityPrecision);
}
