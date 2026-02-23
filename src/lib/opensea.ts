/**
 * OpenSea API integration for fetching NFTs owned by an address on Base chain
 */

interface OpenSeaNFT {
  identifier: string;
  collection: string;
  contract: string;
  token_standard: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  metadata_url: string | null;
}

interface OpenSeaResponse {
  nfts: OpenSeaNFT[];
  next: string | null;
}

interface OwnedNFT {
  tokenId: string;
  collection: string;
  contract: string;
}

/**
 * Get API key from environment or local config file
 */
function getApiKey(): string | null {
  // Try environment variable first (Vercel)
  if (process.env.OPENSEA_API_KEY) {
    return process.env.OPENSEA_API_KEY;
  }
  
  // For server-side, try reading from config file
  if (typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      const configPath = '/workspace/.config/opensea/api-key.txt';
      if (fs.existsSync(configPath)) {
        return fs.readFileSync(configPath, 'utf-8').trim();
      }
    } catch {
      // File doesn't exist or can't be read
    }
  }
  
  return null;
}

/**
 * Fetch all NFTs owned by an address on Base chain
 * @param address - Wallet address to check
 * @param collectionAddress - Optional: filter by specific collection contract address
 * @returns Array of owned NFTs with tokenId and collection info
 */
export async function getNftsForAddress(
  address: string,
  collectionAddress?: string
): Promise<OwnedNFT[]> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('OpenSea API key not configured');
  }
  
  const allNfts: OwnedNFT[] = [];
  let nextCursor: string | null = null;
  
  do {
    // Build URL with pagination
    let url = `https://api.opensea.io/api/v2/chain/base/account/${address}/nfts`;
    const params = new URLSearchParams();
    
    if (nextCursor) {
      params.set('next', nextCursor);
    }
    
    // Add limit for efficiency
    params.set('limit', '200');
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid OpenSea API key');
      }
      if (response.status === 429) {
        throw new Error('OpenSea API rate limited');
      }
      throw new Error(`OpenSea API error: ${response.status}`);
    }
    
    const data: OpenSeaResponse = await response.json();
    
    // Process NFTs from this page
    for (const nft of data.nfts) {
      // If filtering by collection, check contract address
      if (collectionAddress) {
        if (nft.contract.toLowerCase() !== collectionAddress.toLowerCase()) {
          continue;
        }
      }
      
      allNfts.push({
        tokenId: nft.identifier,
        collection: nft.collection,
        contract: nft.contract,
      });
    }
    
    nextCursor = data.next;
  } while (nextCursor);
  
  return allNfts;
}

/**
 * Get just the token IDs owned by an address for a specific collection
 * This is the main function used by the claim page
 * @param userAddress - Wallet address to check
 * @param collectionAddress - NFT collection contract address
 * @returns Array of token ID strings
 */
export async function getOwnedTokenIds(
  userAddress: string,
  collectionAddress: string
): Promise<string[]> {
  const nfts = await getNftsForAddress(userAddress, collectionAddress);
  return nfts.map(nft => nft.tokenId);
}
