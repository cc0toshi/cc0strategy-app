'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatEther } from 'viem';
import { NFTCard, type NFTData } from './NFTCard';
import { NFTDetailModal } from './NFTDetailModal';

interface NFTMarketplaceProps {
  collectionAddress: string;
  collectionName?: string;
  chain: string;
}

type FilterOption = 'all' | 'listed';
type SortOption = 'price_asc' | 'price_desc' | 'id_asc' | 'id_desc';

interface CollectionStats {
  floorPrice: number | null;
  listedCount: number;
  totalSupply: number | null;
}

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer-production-812c.up.railway.app';

function formatEth(wei: string | null): string {
  if (!wei || wei === '0') return '—';
  const eth = parseFloat(formatEther(BigInt(wei)));
  if (eth < 0.001) return '<0.001 Ξ';
  return `${eth.toFixed(4)} Ξ`;
}

export function NFTMarketplace({ collectionAddress, collectionName, chain }: NFTMarketplaceProps) {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');
  const [selectedNft, setSelectedNft] = useState<NFTData | null>(null);
  const [pageKey, setPageKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Fetch NFTs
  useEffect(() => {
    if (!collectionAddress || collectionAddress === '0x0000000000000000000000000000000000000000') {
      setNfts([]);
      setLoading(false);
      return;
    }

    const fetchNFTs = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/nfts/collection/${collectionAddress}?chain=${chain}`);
        
        if (!res.ok) {
          throw new Error('Failed to fetch NFTs');
        }
        
        const data = await res.json();
        setNfts(data.nfts || []);
        setStats({
          floorPrice: data.collection?.floorPrice || null,
          listedCount: data.collection?.listedCount || 0,
          totalSupply: data.collection?.totalSupply || null,
        });
        setPageKey(data.pagination?.pageKey || null);
        setHasMore(data.pagination?.hasMore || false);
      } catch (e: any) {
        console.error('Error fetching NFTs:', e);
        setError(e.message);
      }
      
      setLoading(false);
    };

    fetchNFTs();
  }, [collectionAddress, chain]);

  // Load more NFTs
  const loadMore = async () => {
    if (!pageKey) return;
    
    try {
      const res = await fetch(`/api/nfts/collection/${collectionAddress}?chain=${chain}&pageKey=${pageKey}`);
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

  // Don't render if no collection
  if (!collectionAddress || collectionAddress === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  return (
    <div className="border-2 border-white mt-6">
      {/* Header */}
      <div className="border-b-2 border-white p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="font-editorial text-lg uppercase tracking-wider">
            NFT COLLECTION
          </h3>
          <div className="text-neutral-500 text-xs mt-1">
            {collectionName || 'Linked NFTs'} • Trade NFTs, earn fees
          </div>
        </div>
        
        {/* Stats */}
        {stats && (
          <div className="flex gap-6 text-sm">
            <div>
              <div className="text-neutral-500 text-[10px] uppercase">Floor</div>
              <div className="font-mono">{stats.floorPrice ? `${stats.floorPrice.toFixed(4)} Ξ` : '—'}</div>
            </div>
            <div>
              <div className="text-neutral-500 text-[10px] uppercase">Listed</div>
              <div className="font-mono">{stats.listedCount}</div>
            </div>
            <div>
              <div className="text-neutral-500 text-[10px] uppercase">Supply</div>
              <div className="font-mono">{stats.totalSupply?.toLocaleString() || '—'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="border-b border-neutral-800 p-3 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1">
          {(['all', 'listed'] as FilterOption[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                filter === f
                  ? 'bg-white text-black'
                  : 'border border-neutral-700 hover:border-white'
              }`}
            >
              {f === 'listed' ? 'BUY NOW' : 'ALL'}
            </button>
          ))}
        </div>
        
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortOption)}
          className="bg-black border border-neutral-700 px-2 py-1.5 text-[10px] font-bold uppercase focus:outline-none focus:border-white"
        >
          <option value="price_asc">PRICE ↑</option>
          <option value="price_desc">PRICE ↓</option>
          <option value="id_asc">ID ↑</option>
          <option value="id_desc">ID ↓</option>
        </select>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-2xl animate-pulse">◐</div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-neutral-500">
            <div className="text-2xl mb-2">⚠</div>
            <div className="text-sm">{error}</div>
          </div>
        ) : displayedNfts.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <div className="text-2xl mb-2">∅</div>
            <div className="text-sm">
              {filter === 'listed' ? 'No NFTs listed for sale' : 'No NFTs found'}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {displayedNfts.map(nft => (
                <NFTCard 
                  key={nft.tokenId} 
                  nft={nft}
                  onClick={() => setSelectedNft(nft)}
                />
              ))}
            </div>
            
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMore}
                  className="border border-neutral-700 hover:border-white px-6 py-2 text-xs font-bold uppercase"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* NFT Detail Modal */}
      {selectedNft && (
        <NFTDetailModal
          nft={selectedNft}
          collectionAddress={collectionAddress}
          collectionName={collectionName || 'Collection'}
          chain={chain}
          onClose={() => setSelectedNft(null)}
        />
      )}
    </div>
  );
}
