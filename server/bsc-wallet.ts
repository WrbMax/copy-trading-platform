/**
 * BSC Wallet Module
 * - HD wallet derivation for per-user deposit addresses
 * - BSCScan API polling for USDT (BEP-20) deposit detection
 * - Auto-collection (sweep) to main wallet
 *
 * Uses system_config table to store:
 *   - hd_mnemonic_encrypted: encrypted HD wallet mnemonic
 *   - hd_next_index: next derivation index
 *   - main_wallet_address: main collection wallet address
 *   - bscscan_api_key: BSCScan API key for monitoring
 *
 * Uses deposits table to track detected on-chain deposits
 */

import { ethers } from "ethers";
import { encrypt, decrypt } from "./crypto";
import { getSystemConfig, setSystemConfig, getDb } from "./db";
import { deposits, users, fundTransactions } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

// BSC Mainnet config
const BSC_RPC_URL = "https://bsc-dataseed1.binance.org";
const BSC_CHAIN_ID = 56;
const USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955"; // BSC USDT

// Minimal ERC-20 ABI for transfer and balanceOf
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// BSCScan API base
const BSCSCAN_API = "https://api.bscscan.com/api";

// ─── HD Wallet Functions ──────────────────────────────────────────────────────

/**
 * Initialize HD wallet with a new mnemonic (call once during setup)
 */
export async function initHDWallet(): Promise<{ mnemonic: string; mainAddress: string }> {
  const existing = await getSystemConfig("hd_mnemonic_encrypted");
  if (existing) {
    const mnemonic = decrypt(existing);
    const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0");
    const mainWallet = hdNode.deriveChild(0);
    return { mnemonic, mainAddress: mainWallet.address };
  }

  // Generate new mnemonic
  const wallet = ethers.Wallet.createRandom();
  const mnemonic = wallet.mnemonic!.phrase;
  const encrypted = encrypt(mnemonic);

  await setSystemConfig("hd_mnemonic_encrypted", encrypted);
  await setSystemConfig("hd_next_index", "1"); // index 0 is main wallet
  await setSystemConfig("main_wallet_address", wallet.address);

  return { mnemonic, mainAddress: wallet.address };
}

/**
 * Import existing HD wallet from mnemonic
 */
export async function importHDWallet(mnemonic: string): Promise<{ mainAddress: string }> {
  // Validate mnemonic
  if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic phrase");
  }

  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0");
  const mainWallet = hdNode.deriveChild(0);

  const encrypted = encrypt(mnemonic);
  await setSystemConfig("hd_mnemonic_encrypted", encrypted);
  await setSystemConfig("hd_next_index", "1");
  await setSystemConfig("main_wallet_address", mainWallet.address);

  return { mainAddress: mainWallet.address };
}

/**
 * Derive a new deposit address for a user
 */
export async function deriveDepositAddress(userId: number): Promise<{ address: string; index: number }> {
  const mnemonicEncrypted = await getSystemConfig("hd_mnemonic_encrypted");
  if (!mnemonicEncrypted) throw new Error("HD wallet not initialized");

  const mnemonic = decrypt(mnemonicEncrypted);
  const nextIndexStr = await getSystemConfig("hd_next_index") ?? "1";
  const nextIndex = parseInt(nextIndexStr, 10);

  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0");
  const childWallet = hdNode.deriveChild(nextIndex);

  // Store the mapping in system_config as JSON
  // Key: deposit_addr_{userId}, Value: JSON { address, index }
  await setSystemConfig(`deposit_addr_${userId}`, JSON.stringify({
    address: childWallet.address,
    index: nextIndex,
  }));

  // Increment next index
  await setSystemConfig("hd_next_index", (nextIndex + 1).toString());

  return { address: childWallet.address, index: nextIndex };
}

/**
 * Get user's deposit address (derive if not exists)
 */
export async function getUserDepositAddress(userId: number): Promise<{ address: string; index: number } | null> {
  const data = await getSystemConfig(`deposit_addr_${userId}`);
  if (data) {
    return JSON.parse(data);
  }
  return null;
}

/**
 * Get or create user's deposit address
 */
export async function getOrCreateDepositAddress(userId: number): Promise<{ address: string; index: number }> {
  const existing = await getUserDepositAddress(userId);
  if (existing) return existing;
  return deriveDepositAddress(userId);
}

/**
 * Get the private key for a derived address (for collection)
 */
async function getPrivateKeyForIndex(index: number): Promise<string> {
  const mnemonicEncrypted = await getSystemConfig("hd_mnemonic_encrypted");
  if (!mnemonicEncrypted) throw new Error("HD wallet not initialized");
  const mnemonic = decrypt(mnemonicEncrypted);
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0");
  return hdNode.deriveChild(index).privateKey;
}

/**
 * Get main wallet private key (index 0)
 */
async function getMainWalletPrivateKey(): Promise<string> {
  return getPrivateKeyForIndex(0);
}

// ─── BSCScan Monitoring ───────────────────────────────────────────────────────

/**
 * Check USDT balance of an address via BSC RPC
 */
export async function getUSDTBalance(address: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL, BSC_CHAIN_ID);
    const contract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, provider);
    const balance = await contract.balanceOf(address);
    return ethers.formatUnits(balance, 18); // BSC USDT is 18 decimals
  } catch (error) {
    console.error(`[BSC] Failed to get USDT balance for ${address}:`, error);
    return "0";
  }
}

/**
 * Get BNB balance of an address
 */
export async function getBNBBalance(address: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL, BSC_CHAIN_ID);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error(`[BSC] Failed to get BNB balance for ${address}:`, error);
    return "0";
  }
}

/**
 * Fetch USDT transfer events for an address from BSCScan
 */
export async function fetchUSDTTransfers(
  address: string,
  startBlock = 0,
  apiKey?: string
): Promise<Array<{
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  timeStamp: number;
}>> {
  try {
    const key = apiKey || (await getSystemConfig("bscscan_api_key")) || "";
    const url = `${BSCSCAN_API}?module=account&action=tokentx&contractaddress=${USDT_CONTRACT}&address=${address}&startblock=${startBlock}&endblock=99999999&sort=asc&apikey=${key}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "1" || !Array.isArray(data.result)) {
      return [];
    }

    return data.result
      .filter((tx: any) => tx.to.toLowerCase() === address.toLowerCase())
      .map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatUnits(tx.value, parseInt(tx.tokenDecimal || "18")),
        blockNumber: parseInt(tx.blockNumber),
        timeStamp: parseInt(tx.timeStamp),
      }));
  } catch (error) {
    console.error(`[BSCScan] Failed to fetch transfers for ${address}:`, error);
    return [];
  }
}

// ─── Deposit Detection & Auto-Credit ──────────────────────────────────────────

/**
 * Scan all user deposit addresses for new USDT deposits
 * This should be called periodically (e.g., every 2-5 minutes)
 */
export async function scanDeposits(): Promise<{
  detected: number;
  credited: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) return { detected: 0, credited: 0, errors: ["Database not available"] };

  const errors: string[] = [];
  let detected = 0;
  let credited = 0;

  try {
    // Get all user deposit address configs
    const configs = await db.select().from(
      (await import("../drizzle/schema")).systemConfig
    ).where(sql`\`key\` LIKE 'deposit_addr_%'`);

    for (const config of configs) {
      try {
        const userIdStr = config.key.replace("deposit_addr_", "");
        const userId = parseInt(userIdStr, 10);
        if (isNaN(userId)) continue;

        const addrData = JSON.parse(config.value);
        const address = addrData.address;

        // Get last checked block for this address
        const lastBlockKey = `last_block_${address}`;
        const lastBlockStr = await getSystemConfig(lastBlockKey) ?? "0";
        const lastBlock = parseInt(lastBlockStr, 10);

        // Fetch new transfers
        const transfers = await fetchUSDTTransfers(address, lastBlock + 1);

        for (const tx of transfers) {
          // Check if already recorded
          const existing = await db.select().from(deposits)
            .where(eq(deposits.txHash, tx.hash)).limit(1);

          if (existing.length > 0) continue;

          const amount = parseFloat(tx.value);
          if (amount <= 0) continue;

          // Record the deposit as auto-detected and approved
          await db.insert(deposits).values({
            userId,
            amount: amount.toFixed(8),
            txHash: tx.hash,
            fromAddress: tx.from,
            toAddress: address,
            proofNote: "链上自动检测",
            status: "approved",
            reviewedAt: new Date(),
          });
          detected++;

          // Auto-credit to user balance
          const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
          if (user) {
            const newBalance = parseFloat(user.balance || "0") + amount;
            await db.update(users).set({ balance: newBalance.toFixed(8) }).where(eq(users.id, userId));
            await db.insert(fundTransactions).values({
              userId,
              type: "deposit",
              amount: amount.toFixed(8),
              balanceAfter: newBalance.toFixed(8),
              note: `BSC链上充值自动到账 TxHash: ${tx.hash.substring(0, 10)}...`,
            });
            credited++;
          }

          // Update last checked block
          if (tx.blockNumber > lastBlock) {
            await setSystemConfig(lastBlockKey, tx.blockNumber.toString());
          }
        }
      } catch (err: any) {
        errors.push(`User ${config.key}: ${err.message}`);
      }
    }
  } catch (err: any) {
    errors.push(`Scan error: ${err.message}`);
  }

  return { detected, credited, errors };
}

// ─── Auto Collection (Sweep) ──────────────────────────────────────────────────

/**
 * Send BNB gas to a child address for USDT transfer
 */
async function sendGasToChild(childAddress: string, gasAmount = "0.001"): Promise<string> {
  const mainPrivateKey = await getMainWalletPrivateKey();
  const provider = new ethers.JsonRpcProvider(BSC_RPC_URL, BSC_CHAIN_ID);
  const mainWallet = new ethers.Wallet(mainPrivateKey, provider);

  const tx = await mainWallet.sendTransaction({
    to: childAddress,
    value: ethers.parseEther(gasAmount),
  });
  await tx.wait();
  return tx.hash;
}

/**
 * Sweep USDT from a child address to the main wallet
 */
async function sweepUSDT(childIndex: number, childAddress: string, mainAddress: string): Promise<string> {
  const childPrivateKey = await getPrivateKeyForIndex(childIndex);
  const provider = new ethers.JsonRpcProvider(BSC_RPC_URL, BSC_CHAIN_ID);
  const childWallet = new ethers.Wallet(childPrivateKey, provider);
  const usdtContract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, childWallet);

  const balance = await usdtContract.balanceOf(childAddress);
  if (balance === BigInt(0)) return "";

  const tx = await usdtContract.transfer(mainAddress, balance);
  await tx.wait();
  return tx.hash;
}

/**
 * Collect USDT from all child addresses to main wallet
 * This should be called periodically (e.g., every 30 minutes)
 */
export async function collectDeposits(): Promise<{
  collected: number;
  totalAmount: string;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) return { collected: 0, totalAmount: "0", errors: ["Database not available"] };

  const mainAddress = await getSystemConfig("main_wallet_address");
  if (!mainAddress) return { collected: 0, totalAmount: "0", errors: ["Main wallet not configured"] };

  const errors: string[] = [];
  let collected = 0;
  let totalAmount = 0;

  try {
    const configs = await db.select().from(
      (await import("../drizzle/schema")).systemConfig
    ).where(sql`\`key\` LIKE 'deposit_addr_%'`);

    for (const config of configs) {
      try {
        const addrData = JSON.parse(config.value);
        const address = addrData.address;
        const index = addrData.index;

        // Check USDT balance
        const balance = await getUSDTBalance(address);
        const balanceNum = parseFloat(balance);

        // Only collect if balance > 1 USDT (to avoid dust)
        if (balanceNum < 1) continue;

        // Check if child has enough BNB for gas
        const bnbBalance = await getBNBBalance(address);
        if (parseFloat(bnbBalance) < 0.0005) {
          // Send gas from main wallet
          try {
            await sendGasToChild(address, "0.001");
            // Wait a bit for gas to arrive
            await new Promise(resolve => setTimeout(resolve, 5000));
          } catch (gasErr: any) {
            errors.push(`Gas send to ${address} failed: ${gasErr.message}`);
            continue;
          }
        }

        // Sweep USDT to main wallet
        const txHash = await sweepUSDT(index, address, mainAddress);
        if (txHash) {
          collected++;
          totalAmount += balanceNum;
          console.log(`[BSC] Collected ${balance} USDT from ${address} -> ${mainAddress}, tx: ${txHash}`);
        }
      } catch (err: any) {
        errors.push(`Collection from ${config.key}: ${err.message}`);
      }
    }
  } catch (err: any) {
    errors.push(`Collection error: ${err.message}`);
  }

  return { collected, totalAmount: totalAmount.toFixed(8), errors };
}

// ─── Wallet Status ────────────────────────────────────────────────────────────

export async function getWalletStatus(): Promise<{
  initialized: boolean;
  mainAddress: string | null;
  mainUSDTBalance: string;
  mainBNBBalance: string;
  totalUserAddresses: number;
  nextIndex: number;
}> {
  const mainAddress = await getSystemConfig("main_wallet_address");
  const nextIndex = parseInt(await getSystemConfig("hd_next_index") ?? "0", 10);
  const mnemonicExists = !!(await getSystemConfig("hd_mnemonic_encrypted"));

  let mainUSDTBalance = "0";
  let mainBNBBalance = "0";
  let totalUserAddresses = 0;

  if (mainAddress) {
    mainUSDTBalance = await getUSDTBalance(mainAddress);
    mainBNBBalance = await getBNBBalance(mainAddress);
  }

  const db = await getDb();
  if (db) {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(
      (await import("../drizzle/schema")).systemConfig
    ).where(sql`\`key\` LIKE 'deposit_addr_%'`);
    totalUserAddresses = Number(result.count);
  }

  return {
    initialized: mnemonicExists,
    mainAddress: mainAddress ?? null,
    mainUSDTBalance,
    mainBNBBalance,
    totalUserAddresses,
    nextIndex,
  };
}
