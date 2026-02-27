'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatEther, parseEther } from 'viem';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

interface NFT {
  tokenId: string;
  name: string;
  description: string | null;
  image: string | null;
  traits: Array<{ trait_type: string; value: string }>;
  listing: {
    orderHash: string;
    price: string;
    seller: string;
    endTime: string;
  } | null;
}

interface Collection {
  address: string;
  chain: string;
  name: string;
  symbol: string | null;
  totalSupply: number | null;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  floorPrice: number | null;
  listedCount: number;
}

type SortOption = 'price_asc' | 'price_desc' | 'id_asc' | 'id_desc';
type FilterOption = 'all' | 'listed' | 'unlisted';

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatEth(wei: string): string {
  const eth = parseFloat(formatEther(BigInt(wei)));
  if (eth < 0.001) return '<0.001';
  return eth.toFixed(4);
}

function NFTCard({ nft, collectionAddress, chain }: { nft: NFT; collectionAddress: string; chain: string }) {
  const [imageError, setImageError] = useState(false);
  
  return (
    <Link 
      href={`/nft/${collectionAddress}/${nft.tokenId}?chain=${chain}`}
      className="border-2 border-neutral-800 hover:border-white transition-colors group bg-black"
    >
      {/* Image */}
      <div className="aspect-square bg-neutral-900 relative overflow-hidden">
        {nft.image && !imageError ? (
          <Image
            src={nft.image.startsWith('ipfs://') 
              ? nft.image.replace('ipfs://', 'https://ipfs.io/ipfs/') 
              : nft.image}
            alt={nft.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-neutral-700">
            #{nft.tokenId}
          </div>
        )}
        
        {/* Listed badge */}
        {nft.listing && (
          <div className="absolute top-2 left-2 bg-green-500 text-black px-2 py-0.5 text-[10px] font-bold">
            LISTED
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-3 border-t border-neutral-800">
        <div className="font-mono text-sm truncate">{nft.name}</div>
        
        {nft.listing ? (
          <div className="mt-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-neutral-500 uppercase">Price</div>
              <div className="font-mono font-bold">{formatEth(nft.listing.price)} Ξ</div>
            </div>
            <button className="bg-white text-black px-3 py-1.5 text-xs font-bold hover:bg-neutral-200 transition-colors">
              BUY
            </button>
          </div>
        ) : (
          <div className="mt-2 text-neutral-500 text-xs">
            Not listed
          </div>
        )}
      </div>
    </Link>
  );
}

export default function CollectionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const address = params.address as string;
  const chain = searchParams.get('chain') || 'base';
  
  const { isConnected } = useAccount();
  const { connect } = useConnect();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageKey, setPageKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [linkedToken, setLinkedToken] = useState<any>(null);

  // Fetch collection data
  useEffect(() => {
    const fetchCollection = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/nfts/collection/${address}?chain=${chain}`);
        if (res.ok) {
          const data = await res.json();
          setCollection(data.collection);
          setNfts(data.nfts || []);
          setPageKey(data.pagination?.pageKey || null);
          setHasMore(data.pagination?.hasMore || false);
        }
        
        // Fetch linked token
        const tokenRes = await fetch(`/api/tokens`);
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const linked = (tokenData.tokens || []).find(
            (t: any) => t.nft_collection?.toLowerCase() === address.toLowerCase()
          );
          setLinkedToken(linked);
        }
      } catch (e) {
        console.error('Error fetching collection:', e);
      }
      setLoading(false);
    };

    fetchCollection();
  }, [address, chain]);

  // Load more NFTs
  const loadMore = async () => {
    if (!pageKey) return;
    
    try {
      const res = await fetch(`/api/nfts/collection/${address}?chain=${chain}&pageKey=${pageKey}`);
      if (res.ok) {
        const data = await res.json();
        setNfts(prev => [...prev, ...(data.nfts || [])]);
        setPageKey(data.pagination?.pageKey || null);
        setHasMore(data.pagination?.hasMore || false);
      }
    } catch (e) {
      console.error('Error loading more:', e);
    }
  };

  // Filtered and sorted NFTs
  const displayedNfts = useMemo(() => {
    let filtered = [...nfts];
    
    // Apply filter
    if (filter === 'listed') {
      filtered = filtered.filter(n => n.listing !== null);
    } else if (filter === 'unlisted') {
      filtered = filtered.filter(n => n.listing === null);
    }
    
    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          if (!a.listing && !b.listing) return 0;
          if (!a.listing) return 1;
          if (!b.listing) return -1;
          return BigInt(a.listing.price) > BigInt(b.listing.price) ? 1 : -1;
        case 'price_desc':
          if (!a.listing && !b.listing) return 0;
          if (!a.listing) return 1;
          if (!b.listing) return -1;
          return BigInt(a.listing.price) < BigInt(b.listing.price) ? 1 : -1;
        case 'id_asc':
          return parseInt(a.tokenId) - parseInt(b.tokenId);
        case 'id_desc':
          return parseInt(b.tokenId) - parseInt(a.tokenId);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [nfts, filter, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse">◐</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">∅</div>
          <h1 className="text-2xl font-bold mb-2">Collection Not Found</h1>
          <Link href="/marketplace" className="text-neutral-500 hover:text-white">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="h-32 md:h-48 bg-neutral-900 relative overflow-hidden">
        {collection.bannerUrl && (
          <Image
            src={collection.bannerUrl}
            alt="Banner"
            fill
            className="object-cover opacity-50"
            unoptimized
          />
        )}
      </div>

      {/* Collection Header */}
      <div className="border-b-2 border-white">
        <div className="container-editorial py-6 -mt-16 relative">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            {/* Collection Image */}
            <div className="w-24 h-24 md:w-32 md:h-32 bg-neutral-900 border-4 border-black relative flex-shrink-0 overflow-hidden">
              {collection.imageUrl ? (
                <Image
                  src={collection.imageUrl}
                  alt={collection.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-neutral-600">
                  {collection.name[0].toUpperCase()}
                </div>
              )}
            </div>
            
            {/* Collection Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-editorial text-2xl md:text-4xl font-bold truncate">
                  {collection.name}
                </h1>
                <span className={`px-2 py-0.5 text-[10px] font-bold ${
                  chain === 'base' ? 'bg-blue-900/50 text-blue-400' : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {chain.toUpperCase()}
                </span>
              </div>
              
              {collection.description && (
                <p className="text-neutral-400 text-sm line-clamp-2 mb-4">
                  {collection.description}
                </p>
              )}
              
              {/* Stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <div className="text-neutral-500 text-xs">ITEMS</div>
                  <div className="font-mono font-bold">{collection.totalSupply?.toLocaleString() || '—'}</div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs">FLOOR</div>
                  <div className="font-mono font-bold">
                    {collection.floorPrice ? `${collection.floorPrice.toFixed(4)} Ξ` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs">LISTED</div>
                  <div className="font-mono font-bold">{collection.listedCount}</div>
                </div>
                {linkedToken && (
                  <div>
                    <div className="text-neutral-500 text-xs">TOKEN</div>
                    <Link 
                      href={`/swap?token=${linkedToken.address}`}
                      className="font-mono font-bold text-green-400 hover:underline"
                    >
                      ${linkedToken.symbol}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="border-b border-neutral-800 sticky top-0 bg-black z-10">
        <div className="container-editorial py-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            {(['all', 'listed', 'unlisted'] as FilterOption[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-xs font-bold border-2 transition-colors ${
                  filter === f
                    ? 'bg-white text-black border-white'
                    : 'border-neutral-700 hover:border-white'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="bg-black border-2 border-neutral-700 px-4 py-2 text-xs font-bold focus:outline-none focus:border-white"
          >
            <option value="price_asc">PRICE: LOW TO HIGH</option>
            <option value="price_desc">PRICE: HIGH TO LOW</option>
            <option value="id_asc">TOKEN ID ↑</option>
            <option value="id_desc">TOKEN ID ↓</option>
          </select>
        </div>
      </div>

      {/* NFT Grid */}
      <div className="container-editorial py-8">
        {displayedNfts.length === 0 ? (
          <div className="border-2 border-neutral-800 p-16 text-center">
            <div className="text-4xl mb-4">∅</div>
            <p className="text-neutral-500">
              {filter === 'listed' ? 'No NFTs currently listed' : 'No NFTs found'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedNfts.map(nft => (
                <NFTCard 
                  key={nft.tokenId} 
                  nft={nft} 
                  collectionAddress={address}
                  chain={chain}
                />
              ))}
            </div>
            
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  className="border-2 border-white px-8 py-3 font-bold hover:bg-white hover:text-black transition-colors"
                >
                  LOAD MORE
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
