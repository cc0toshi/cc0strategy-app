// @ts-nocheck
import { type Address } from 'viem';
import { type DeployedToken } from '@/lib/indexer';

// ═══════════════════════════════════════════════════════════════════════════════════
// TOKEN CACHE
// ═══════════════════════════════════════════════════════════════════════════════════

// In-memory cache for tokens (server-side)
let tokenCache: DeployedToken[] = [];
let lastFetchTime: number = 0;
const CACHE_TTL = 60000; // 1 minute cache TTL

/**
 * Get cached tokens (for server components)
 */
export function getCachedTokens(): DeployedToken[] {
  return tokenCache;
}

/**
 * Update token cache
 */
export function updateTokenCache(tokens: DeployedToken[]): void {
  tokenCache = tokens;
  lastFetchTime = Date.now();
}

/**
 * Check if cache is stale
 */
export function isCacheStale(): boolean {
  return Date.now() - lastFetchTime > CACHE_TTL;
}

// ═══════════════════════════════════════════════════════════════════════════════════
// TOKEN REGISTRY (Static known tokens)
// ═══════════════════════════════════════════════════════════════════════════════════

export interface TokenRegistryEntry {
  address: Address;
  name: string;
  symbol: string;
  image?: string;
  nftCollection: Address;
  nftName?: string;
  featured?: boolean;
}

/**
 * Registry of known/featured tokens
 * This can be used for UI highlighting or quick lookups
 */
export const TOKEN_REGISTRY: TokenRegistryEntry[] = [
  // Add featured tokens here as they launch
  // {
  //   address: '0x...',
  //   name: 'Example Token',
  //   symbol: 'EX',
  //   nftCollection: '0x...',
  //   nftName: 'Example NFTs',
  //   featured: true,
  // },
];

/**
 * Get featured tokens
 */
export function getFeaturedTokens(): TokenRegistryEntry[] {
  return TOKEN_REGISTRY.filter(t => t.featured);
}

/**
 * Check if a token is in registry
 */
export function isRegisteredToken(address: Address): boolean {
  return TOKEN_REGISTRY.some(t => 
    t.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Get registry entry for token
 */
export function getRegistryEntry(address: Address): TokenRegistryEntry | undefined {
  return TOKEN_REGISTRY.find(t => 
    t.address.toLowerCase() === address.toLowerCase()
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format timestamp to relative time
 */
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() / 1000) - timestamp);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return new Date(timestamp * 1000).toLocaleDateString();
}

/**
 * Get Base explorer URL for token
 */
export function getTokenExplorerUrl(address: Address): string {
  return `https://basescan.org/token/${address}`;
}

/**
 * Get Base explorer URL for NFT collection
 */
export function getNftExplorerUrl(address: Address): string {
  return `https://basescan.org/address/${address}`;
}

/**
 * Get Base explorer URL for transaction
 */
export function getTxExplorerUrl(hash: string): string {
  return `https://basescan.org/tx/${hash}`;
}
