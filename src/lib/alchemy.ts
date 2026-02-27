// Alchemy NFT API Client for cc0strategy
// Server-side only - uses ALCHEMY_API_KEY from env

const ALCHEMY_ENDPOINTS: Record<string, string> = {
  base: 'https://base-mainnet.g.alchemy.com/nft/v3/',
  ethereum: 'https://eth-mainnet.g.alchemy.com/nft/v3/',
};

export interface AlchemyNFT {
  contract: { address: string };
  tokenId: string;
  name?: string;
  description?: string;
  image?: {
    cachedUrl?: string;
    originalUrl?: string;
    pngUrl?: string;
    thumbnailUrl?: string;
  };
  collection?: {
    name?: string;
    slug?: string;
  };
  raw?: {
    metadata?: {
      attributes?: Array<{ trait_type: string; value: string }>;
    };
  };
}

export interface AlchemyNFTResponse {
  ownedNfts: AlchemyNFT[];
  totalCount: number;
  pageKey?: string;
}

export interface AlchemyContractMetadata {
  address: string;
  name?: string;
  symbol?: string;
  totalSupply?: string;
  tokenType?: string;
  contractDeployer?: string;
  deployedBlockNumber?: number;
  openSeaMetadata?: {
    floorPrice?: number;
    collectionName?: string;
    collectionSlug?: string;
    safelistRequestStatus?: string;
    imageUrl?: string;
    description?: string;
    externalUrl?: string;
    twitterUsername?: string;
    discordUrl?: string;
    bannerImageUrl?: string;
    lastIngestedAt?: string;
  };
}

export interface NFTSale {
  marketplace?: string;
  contractAddress?: string;
  tokenId?: string;
  quantity?: string;
  buyerAddress?: string;
  sellerAddress?: string;
  taker?: string;
  sellerFee?: { amount?: string; tokenAddress?: string };
  protocolFee?: { amount?: string; tokenAddress?: string };
  royaltyFee?: { amount?: string; tokenAddress?: string };
  blockNumber?: number;
  transactionHash?: string;
  logIndex?: number;
}

function getApiKey(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error('ALCHEMY_API_KEY not configured');
  return key;
}

function getEndpoint(chain: string): string {
  const endpoint = ALCHEMY_ENDPOINTS[chain];
  if (!endpoint) throw new Error(`Unsupported chain: ${chain}`);
  return endpoint;
}

// Get NFTs for a collection
export async function getNFTsForCollection(
  contractAddress: string,
  chain: string = 'base',
  options: { pageSize?: number; pageKey?: string; withMetadata?: boolean } = {}
): Promise<{ nfts: AlchemyNFT[]; pageKey?: string; totalCount: number }> {
  const apiKey = getApiKey();
  const endpoint = getEndpoint(chain);
  
  const params = new URLSearchParams({
    withMetadata: String(options.withMetadata ?? true),
    limit: String(options.pageSize || 100),
  });
  if (options.pageKey) params.set('startToken', options.pageKey);

  const url = `${endpoint}${apiKey}/getNFTsForContract?contractAddress=${contractAddress}&${params}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!response.ok) {
    throw new Error(`Alchemy API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    nfts: data.nfts || [],
    pageKey: data.pageKey,
    totalCount: parseInt(data.totalCount || '0'),
  };
}

// Get single NFT metadata
export async function getNFTMetadata(
  contractAddress: string,
  tokenId: string,
  chain: string = 'base'
): Promise<AlchemyNFT | null> {
  const apiKey = getApiKey();
  const endpoint = getEndpoint(chain);

  const url = `${endpoint}${apiKey}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}&refreshCache=false`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Alchemy API error: ${response.status}`);
  }

  return response.json();
}

// Get NFTs owned by a wallet
export async function getNFTsForOwner(
  ownerAddress: string,
  chain: string = 'base',
  options: { contractAddresses?: string[]; pageSize?: number; pageKey?: string } = {}
): Promise<{ nfts: AlchemyNFT[]; pageKey?: string; totalCount: number }> {
  const apiKey = getApiKey();
  const endpoint = getEndpoint(chain);

  let url = `${endpoint}${apiKey}/getNFTsForOwner?owner=${ownerAddress}&withMetadata=true&pageSize=${options.pageSize || 100}`;
  
  if (options.contractAddresses?.length) {
    for (const addr of options.contractAddresses) {
      url += `&contractAddresses[]=${addr}`;
    }
  }
  if (options.pageKey) url += `&pageKey=${options.pageKey}`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 30 }, // Cache for 30 seconds
  });

  if (!response.ok) {
    throw new Error(`Alchemy API error: ${response.status}`);
  }

  const data: AlchemyNFTResponse = await response.json();
  return {
    nfts: data.ownedNfts || [],
    pageKey: data.pageKey,
    totalCount: data.totalCount,
  };
}

// Get collection/contract metadata
export async function getContractMetadata(
  contractAddress: string,
  chain: string = 'base'
): Promise<AlchemyContractMetadata | null> {
  const apiKey = getApiKey();
  const endpoint = getEndpoint(chain);

  const url = `${endpoint}${apiKey}/getContractMetadata?contractAddress=${contractAddress}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Alchemy API error: ${response.status}`);
  }

  return response.json();
}

// Get floor price
export async function getFloorPrice(
  contractAddress: string,
  chain: string = 'base'
): Promise<{ openSea?: { floorPrice: number }; looksRare?: { floorPrice: number } } | null> {
  const apiKey = getApiKey();
  const endpoint = getEndpoint(chain);

  const url = `${endpoint}${apiKey}/getFloorPrice?contractAddress=${contractAddress}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

// Get NFT sales history
export async function getNFTSales(
  contractAddress: string,
  tokenId?: string,
  chain: string = 'base',
  limit: number = 10
): Promise<NFTSale[]> {
  const apiKey = getApiKey();
  const endpoint = getEndpoint(chain);

  let url = `${endpoint}${apiKey}/getNFTSales?contractAddress=${contractAddress}&order=desc&limit=${limit}`;
  if (tokenId) url += `&tokenId=${tokenId}`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.nftSales || [];
}

// Get owners of a collection
export async function getOwnersForCollection(
  contractAddress: string,
  chain: string = 'base'
): Promise<{ owners: string[]; totalCount: number }> {
  const apiKey = getApiKey();
  const endpoint = getEndpoint(chain);

  const url = `${endpoint}${apiKey}/getOwnersForContract?contractAddress=${contractAddress}&withTokenBalances=false`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    return { owners: [], totalCount: 0 };
  }

  const data = await response.json();
  return {
    owners: data.owners || [],
    totalCount: data.owners?.length || 0,
  };
}

// Helper to get best image URL from NFT
export function getBestImageUrl(nft: AlchemyNFT): string | null {
  const image = nft.image;
  if (!image) return null;
  return image.cachedUrl || image.pngUrl || image.originalUrl || image.thumbnailUrl || null;
}

// Helper to extract traits from NFT
export function getTraits(nft: AlchemyNFT): Array<{ trait_type: string; value: string }> {
  return nft.raw?.metadata?.attributes || [];
}
