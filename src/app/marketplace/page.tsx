'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatEther } from 'viem';

interface Collection {
  address: string;
  name: string | null;
  token_symbol: string;
  token_address: string;
  chain: string;
  floor_price_wei: string;
  listed_count: number;
  volume_24h_wei: string;
  volume_total_wei: string;
  imageUrl?: string;
}

interface Activity {
  id: string;
  event_type: string;
  collection_address: string;
  token_id: string;
  from_address: string | null;
  to_address: string | null;
  price_wei: string | null;
  timestamp: string;
  chain: string;
}

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer-production-812c.up.railway.app';

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatEth(wei: string | null): string {
  if (!wei || wei === '0') return '—';
  const eth = parseFloat(formatEther(BigInt(wei)));
  if (eth < 0.001) return '<0.001 Ξ';
  return `${eth.toFixed(3)} Ξ`;
}

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function ChainBadge({ chain }: { chain: string }) {
  const isBase = chain === 'base';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold ${
      isBase ? 'bg-blue-900/50 text-blue-400' : 'bg-neutral-800 text-neutral-300 border border-neutral-600'
    }`}>
      {isBase ? 'BASE' : 'ETH'}
    </span>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const [imageError, setImageError] = useState(false);
  
  return (
    <Link 
      href={`/collection/${collection.address}?chain=${collection.chain}`}
      className="border-2 border-neutral-800 hover:border-white transition-colors group"
    >
      {/* Image placeholder */}
      <div className="aspect-square bg-neutral-900 relative overflow-hidden">
        {collection.imageUrl && !imageError ? (
          <Image
            src={collection.imageUrl}
            alt={collection.name || 'Collection'}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-neutral-700">
            {(collection.name || 'C')[0].toUpperCase()}
          </div>
        )}
        
        {/* Chain badge */}
        <div className="absolute top-2 right-2">
          <ChainBadge chain={collection.chain} />
        </div>
      </div>
      
      {/* Info */}
      <div className="p-4 border-t border-neutral-800">
        <h3 className="font-bold truncate group-hover:underline">
          {collection.name || formatAddress(collection.address)}
        </h3>
        <div className="text-xs text-neutral-500 mt-1">
          Token: ${collection.token_symbol}
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div>
            <div className="text-neutral-500">FLOOR</div>
            <div className="font-mono">{formatEth(collection.floor_price_wei)}</div>
          </div>
          <div>
            <div className="text-neutral-500">LISTED</div>
            <div className="font-mono">{collection.listed_count}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ActivityRow({ activity, collections }: { activity: Activity; collections: Collection[] }) {
  const collection = collections.find(c => 
    c.address.toLowerCase() === activity.collection_address.toLowerCase()
  );
  
  const eventIcons: Record<string, string> = {
    sale: '💰',
    listing: '📝',
    offer: '🤝',
    transfer: '➡️',
  };
  
  return (
    <div className="flex items-center gap-4 py-3 border-b border-neutral-800 text-sm">
      <span className="text-xl">{eventIcons[activity.event_type] || '•'}</span>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link 
            href={`/nft/${activity.collection_address}/${activity.token_id}?chain=${activity.chain}`}
            className="font-mono hover:underline truncate"
          >
            {collection?.name || formatAddress(activity.collection_address)} #{activity.token_id}
          </Link>
          <ChainBadge chain={activity.chain} />
        </div>
        
        <div className="text-neutral-500 text-xs mt-0.5">
          {activity.event_type === 'sale' && activity.from_address && activity.to_address && (
            <>
              {formatAddress(activity.from_address)} → {formatAddress(activity.to_address)}
            </>
          )}
          {activity.event_type === 'listing' && activity.from_address && (
            <>Listed by {formatAddress(activity.from_address)}</>
          )}
        </div>
      </div>
      
      {activity.price_wei && (
        <div className="font-mono font-bold text-right">
          {formatEth(activity.price_wei)}
        </div>
      )}
      
      <div className="text-neutral-500 text-xs w-16 text-right">
        {timeAgo(activity.timestamp)}
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [chain, setChain] = useState<'base' | 'ethereum'>('base');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [collectionsRes, activityRes] = await Promise.all([
          fetch(`${INDEXER_URL}/marketplace/collections?chain=${chain}`),
          fetch(`${INDEXER_URL}/marketplace/activity?chain=${chain}&limit=10`),
        ]);

        if (collectionsRes.ok) {
          const data = await collectionsRes.json();
          setCollections(data.collections || []);
        }

        if (activityRes.ok) {
          const data = await activityRes.json();
          setActivity(data.activity || []);
        }
      } catch (e) {
        console.error('Error fetching marketplace data:', e);
      }
      setLoading(false);
    };

    fetchData();
  }, [chain]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="border-b-2 border-white">
        <div className="container-editorial py-12">
          <div className="text-xs text-neutral-500 mb-2 tracking-widest">TRADE NFTS</div>
          <h1 className="font-editorial text-4xl md:text-6xl font-bold mb-4">
            MARKETPLACE
          </h1>
          <p className="text-neutral-400 max-w-2xl">
            Buy and sell NFTs from collections linked to cc0strategy tokens. 
            Trading fees flow to NFT holders.
          </p>
        </div>
      </div>

      {/* Chain Selector */}
      <div className="border-b-2 border-neutral-800">
        <div className="container-editorial py-4">
          <div className="flex gap-4">
            <button
              onClick={() => setChain('base')}
              className={`px-6 py-2 font-bold text-sm border-2 transition-colors ${
                chain === 'base' 
                  ? 'bg-white text-black border-white' 
                  : 'border-neutral-700 hover:border-white'
              }`}
            >
              BASE
            </button>
            <button
              onClick={() => setChain('ethereum')}
              className={`px-6 py-2 font-bold text-sm border-2 transition-colors ${
                chain === 'ethereum' 
                  ? 'bg-white text-black border-white' 
                  : 'border-neutral-700 hover:border-white'
              }`}
            >
              ETHEREUM
            </button>
          </div>
        </div>
      </div>

      <div className="container-editorial py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-4xl animate-pulse">◐</div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Collections Grid */}
            <div className="lg:col-span-2">
              <h2 className="font-editorial text-xl font-bold mb-6">
                COLLECTIONS
              </h2>
              
              {collections.length === 0 ? (
                <div className="border-2 border-neutral-800 p-12 text-center">
                  <div className="text-4xl mb-4">∅</div>
                  <p className="text-neutral-500">
                    No collections found on {chain === 'base' ? 'Base' : 'Ethereum'}
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {collections.map(collection => (
                    <CollectionCard key={`${collection.chain}-${collection.address}`} collection={collection} />
                  ))}
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div>
              <h2 className="font-editorial text-xl font-bold mb-6">
                RECENT ACTIVITY
              </h2>
              
              <div className="border-2 border-neutral-800 p-4">
                {activity.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    No recent activity
                  </div>
                ) : (
                  activity.map(item => (
                    <ActivityRow 
                      key={item.id} 
                      activity={item} 
                      collections={collections}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
