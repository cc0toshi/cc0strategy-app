// @ts-nocheck
import { createPublicClient, http, parseAbiItem, type Address, type Log } from 'viem';
import { base } from 'viem/chains';
import { CONTRACTS } from '@/config/contracts';

// ═══════════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════════

export interface DeployedToken {
  tokenAddress: Address;
  tokenAdmin: Address;
  name: string;
  symbol: string;
  image: string;
  metadata: string;
  context: string;
  nftCollection: Address;
  pairedToken: Address;
  poolHook: Address;
  poolId: string;
  locker: Address;
  deployer: Address;
  blockNumber: bigint;
  transactionHash: string;
  timestamp?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════════
// ABI EVENTS
// ═══════════════════════════════════════════════════════════════════════════════════

// Factory TokenCreated event
const TOKEN_CREATED_EVENT = parseAbiItem(
  'event TokenCreated(address msgSender, address indexed tokenAddress, address indexed tokenAdmin, string tokenImage, string tokenName, string tokenSymbol, string tokenMetadata, string tokenContext, int24 startingTick, address poolHook, bytes32 poolId, address pairedToken, address locker, address mevModule, uint256 extensionsSupply, address[] extensions)'
);

// FeeDistributor TokenRegistered event (for NFT collection mapping)
const TOKEN_REGISTERED_EVENT = parseAbiItem(
  'event TokenRegistered(address indexed token, address indexed nftCollection, address indexed feeToken, uint256 nftSupply)'
);

// ═══════════════════════════════════════════════════════════════════════════════════
// CLIENT
// ═══════════════════════════════════════════════════════════════════════════════════

// Use server-side RPC URL (keeps API keys secret)
const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

const publicClient = createPublicClient({
  chain: base,
  transport: http(rpcUrl, {
    retryCount: 3,
    retryDelay: 1000,
  }),
});

// Factory deployment block
const FACTORY_DEPLOYMENT_BLOCK = 28700000n;

// ═══════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchLogsWithRetry(
  address: Address,
  event: any,
  fromBlock: bigint,
  toBlock: bigint,
  retries = 3
): Promise<Log[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await publicClient.getLogs({
        address,
        event,
        fromBlock,
        toBlock,
      });
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429');
      if (isRateLimit && attempt < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      throw error;
    }
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════════════
// INDEXER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all TokenCreated events from Factory
 */
export async function fetchTokenCreatedEvents(fromBlock?: bigint): Promise<Log[]> {
  const startBlock = fromBlock ?? FACTORY_DEPLOYMENT_BLOCK;
  const latestBlock = await publicClient.getBlockNumber();
  
  // Smaller chunks to avoid rate limits
  const CHUNK_SIZE = 10000n;
  const logs: Log[] = [];
  
  for (let block = startBlock; block <= latestBlock; block += CHUNK_SIZE) {
    const toBlock = block + CHUNK_SIZE - 1n > latestBlock ? latestBlock : block + CHUNK_SIZE - 1n;
    
    try {
      const chunkLogs = await fetchLogsWithRetry(
        CONTRACTS.FACTORY,
        TOKEN_CREATED_EVENT,
        block,
        toBlock
      );
      logs.push(...chunkLogs);
      
      // Small delay between chunks to avoid rate limits
      if (block + CHUNK_SIZE <= latestBlock) {
        await sleep(100);
      }
    } catch (error) {
      console.error(`Error fetching logs for blocks ${block}-${toBlock}:`, error);
      // Continue with next chunk instead of failing completely
    }
  }
  
  return logs;
}

/**
 * Fetch all TokenRegistered events from FeeDistributor
 */
export async function fetchTokenRegisteredEvents(fromBlock?: bigint): Promise<Log[]> {
  const startBlock = fromBlock ?? FACTORY_DEPLOYMENT_BLOCK;
  const latestBlock = await publicClient.getBlockNumber();
  
  const CHUNK_SIZE = 10000n;
  const logs: Log[] = [];
  
  for (let block = startBlock; block <= latestBlock; block += CHUNK_SIZE) {
    const toBlock = block + CHUNK_SIZE - 1n > latestBlock ? latestBlock : block + CHUNK_SIZE - 1n;
    
    try {
      const chunkLogs = await fetchLogsWithRetry(
        CONTRACTS.FEE_DISTRIBUTOR,
        TOKEN_REGISTERED_EVENT,
        block,
        toBlock
      );
      logs.push(...chunkLogs);
      
      if (block + CHUNK_SIZE <= latestBlock) {
        await sleep(100);
      }
    } catch (error) {
      console.error(`Error fetching logs for blocks ${block}-${toBlock}:`, error);
    }
  }
  
  return logs;
}

/**
 * Get block timestamp
 */
async function getBlockTimestamp(blockNumber: bigint): Promise<number> {
  const block = await publicClient.getBlock({ blockNumber });
  return Number(block.timestamp);
}

/**
 * Parse TokenCreated event log into DeployedToken
 */
function parseTokenCreatedLog(log: Log & { args: Record<string, unknown> }): Omit<DeployedToken, 'nftCollection' | 'timestamp'> {
  const args = log.args;
  
  return {
    tokenAddress: args.tokenAddress as Address,
    tokenAdmin: args.tokenAdmin as Address,
    name: args.tokenName as string,
    symbol: args.tokenSymbol as string,
    image: args.tokenImage as string,
    metadata: args.tokenMetadata as string,
    context: args.tokenContext as string,
    pairedToken: args.pairedToken as Address,
    poolHook: args.poolHook as Address,
    poolId: args.poolId as string,
    locker: args.locker as Address,
    deployer: args.msgSender as Address,
    blockNumber: log.blockNumber!,
    transactionHash: log.transactionHash!,
  };
}

/**
 * Build token to NFT collection mapping from TokenRegistered events
 */
function buildNftCollectionMap(logs: Log[]): Map<Address, Address> {
  const map = new Map<Address, Address>();
  
  for (const log of logs) {
    const args = (log as Log & { args: Record<string, unknown> }).args;
    const token = args.token as Address;
    const nftCollection = args.nftCollection as Address;
    map.set(token.toLowerCase() as Address, nftCollection);
  }
  
  return map;
}

/**
 * Get NFT collection for a token from FeeDistributor contract
 */
export async function getNftCollectionForToken(tokenAddress: Address): Promise<Address> {
  const result = await publicClient.readContract({
    address: CONTRACTS.FEE_DISTRIBUTOR,
    abi: [
      {
        name: 'tokenToCollection',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'token', type: 'address' }],
        outputs: [{ name: '', type: 'address' }],
      },
    ],
    functionName: 'tokenToCollection',
    args: [tokenAddress],
  });
  
  return result as Address;
}

// ═══════════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Get all deployed tokens
 */
export async function getDeployedTokens(): Promise<DeployedToken[]> {
  // Fetch both event types in parallel
  const [tokenCreatedLogs, tokenRegisteredLogs] = await Promise.all([
    fetchTokenCreatedEvents(),
    fetchTokenRegisteredEvents(),
  ]);
  
  // Build NFT collection mapping
  const nftCollectionMap = buildNftCollectionMap(tokenRegisteredLogs);
  
  // Parse and enrich token data
  const tokens: DeployedToken[] = [];
  
  for (const log of tokenCreatedLogs) {
    const parsedLog = log as Log & { args: Record<string, unknown> };
    const token = parseTokenCreatedLog(parsedLog);
    
    // Get NFT collection from mapping or contract
    let nftCollection = nftCollectionMap.get(token.tokenAddress.toLowerCase() as Address);
    if (!nftCollection) {
      try {
        nftCollection = await getNftCollectionForToken(token.tokenAddress);
      } catch {
        nftCollection = '0x0000000000000000000000000000000000000000' as Address;
      }
    }
    
    // Get timestamp
    let timestamp: number | undefined;
    try {
      timestamp = await getBlockTimestamp(token.blockNumber);
    } catch {
      // timestamp remains undefined
    }
    
    tokens.push({
      ...token,
      nftCollection,
      timestamp,
    });
  }
  
  // Sort by block number descending (newest first)
  tokens.sort((a, b) => Number(b.blockNumber - a.blockNumber));
  
  return tokens;
}

/**
 * Get a single token by address
 */
export async function getTokenByAddress(address: Address): Promise<DeployedToken | null> {
  const tokens = await getDeployedTokens();
  return tokens.find(t => t.tokenAddress.toLowerCase() === address.toLowerCase()) ?? null;
}

/**
 * Get token by NFT collection address
 */
export async function getTokenByCollection(nftAddress: Address): Promise<DeployedToken | null> {
  const tokens = await getDeployedTokens();
  return tokens.find(t => t.nftCollection.toLowerCase() === nftAddress.toLowerCase()) ?? null;
}

/**
 * Get token count
 */
export async function getTokenCount(): Promise<number> {
  const logs = await fetchTokenCreatedEvents();
  return logs.length;
}
