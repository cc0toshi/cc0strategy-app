// cc0strategy contract addresses - Multi-chain support
// NOTE: Token data comes from database, NOT hardcoded here

// Chain-specific INFRASTRUCTURE addresses only
export const CONTRACTS = {
  base: {
    // Core cc0strategy contracts
    FACTORY: '0x70b17db500Ce1746BB34f908140d0279C183f3eb' as const,
    FEE_DISTRIBUTOR: '0x9Ce2AB2769CcB547aAcE963ea4493001275CD557' as const,
    LP_LOCKER: '0x45e1D9bb68E514565710DEaf2567B73EF86638e0' as const,
    HOOK: '0x18aD8c9b72D33E69d8f02fDA61e3c7fAe4e728cc' as const,
    MEV_MODULE: '0x0000000000000000000000000000000000000000' as const,
    
    // Uniswap V4 infrastructure
    POOL_MANAGER: '0x498581fF718922c3f8e6A244956aF099B2652b2b' as const,
    POSITION_MANAGER: '0x7C5f5A4bBd8fD63184577525326123B519429bDc' as const,
    UNIVERSAL_ROUTER: '0x6fF5693b99212Da76ad316178A184AB56D299b43' as const,
    PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const,
    
    // Base tokens
    WETH: '0x4200000000000000000000000000000000000006' as const,
  },
  
  ethereum: {
    // Core cc0strategy contracts - Deployed 2026-02-24
    FACTORY: '0xBbeBcC4aa7DDb4BeA65C86A2eB4147A6f39F10d3' as const,
    FEE_DISTRIBUTOR: '0xF8bFB6aED4A5Bd1c7E4ADa231c0EdDeB49618989' as const,
    LP_LOCKER: '0xb43aaEe744c46822C7f9209ECD5468C97B937030' as const,
    HOOK: '0x9bEbE14d85375634c723EB5DC7B7E07C835dE8CC' as const,
    MEV_MODULE: '0x1cfEd8302B995De1254e4Ff08623C516f8B36Bf6' as const,
    
    // Uniswap V4 infrastructure
    POOL_MANAGER: '0x000000000004444c5dc75cB358380D2e3dE08A90' as const,
    POSITION_MANAGER: '0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e' as const,
    UNIVERSAL_ROUTER: '0x66a9893cC07D91D95644AEDD05D03f95e1dba8Af' as const,
    PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const,
    
    // Ethereum tokens
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as const,
  },
} as const;

// Chain IDs
export const CHAIN_IDS = {
  base: 8453,
  ethereum: 1,
} as const;

// OpenSea chain slugs
export const OPENSEA_CHAIN_SLUGS = {
  base: 'base',
  ethereum: 'ethereum',
} as const;

// Block explorer URLs
export const BLOCK_EXPLORERS = {
  base: 'https://basescan.org',
  ethereum: 'https://etherscan.io',
} as const;

// GeckoTerminal chain slugs
export const GECKO_CHAIN_SLUGS = {
  base: 'base',
  ethereum: 'eth',
} as const;

// Helper types
export type SupportedChain = 'base' | 'ethereum';

// Helper to get contracts for a chain
export function getContracts(chain: SupportedChain) {
  return CONTRACTS[chain];
}

// Helper to get chain from chain ID
export function getChainFromId(chainId: number): SupportedChain | null {
  if (chainId === CHAIN_IDS.base) return 'base';
  if (chainId === CHAIN_IDS.ethereum) return 'ethereum';
  return null;
}

// Check if chain is supported
export function isChainSupported(chainId: number): boolean {
  return chainId === CHAIN_IDS.base || chainId === CHAIN_IDS.ethereum;
}

// Check if chain has deployed contracts
export function hasDeployedContracts(chain: SupportedChain): boolean {
  const contracts = CONTRACTS[chain];
  return contracts.FACTORY !== null;
}

// Pool Key structure for V4
export interface PoolKey {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
}

// Helper to create PoolKey from token data (from database)
export function createPoolKey(
  tokenAddress: `0x${string}`,
  wethAddress: `0x${string}`,
  hookAddress: `0x${string}`
): PoolKey {
  // currency0 must be < currency1 (sorted order)
  const [currency0, currency1] = tokenAddress.toLowerCase() < wethAddress.toLowerCase()
    ? [tokenAddress.toLowerCase() as `0x${string}`, wethAddress.toLowerCase() as `0x${string}`]
    : [wethAddress.toLowerCase() as `0x${string}`, tokenAddress.toLowerCase() as `0x${string}`];
  
  return {
    currency0,
    currency1,
    fee: 8388608, // DYNAMIC_FEE_FLAG
    tickSpacing: 200,
    hooks: hookAddress.toLowerCase() as `0x${string}`,
  };
}
