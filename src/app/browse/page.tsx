'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Token {
  id: number;
  address: string;
  name: string;
  symbol: string;
  nft_collection: string;
  pool_id: string;
  deployer: string;
  image_url: string | null;
  deployed_at: string | null;
  created_at: string;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function TokenCard({ token, index }: { token: Token; index: number }) {
  return (
    <div className="border-2 border-white group hover:bg-white hover:text-black transition-all duration-150">
      <div className="border-b-2 border-white p-6 flex items-start justify-between">
        <div>
          <div className="text-xs text-neutral-500 group-hover:text-neutral-600 mb-2 tracking-wider">
            #{String(index + 1).padStart(3, '0')}
          </div>
          <h3 className="font-bold text-2xl">{token.symbol}</h3>
          <p className="text-neutral-400 group-hover:text-neutral-600 text-sm mt-1">{token.name}</p>
        </div>
        {token.created_at && (
          <span className="text-neutral-600 text-xs font-mono">{formatTimeAgo(token.created_at)}</span>
        )}
      </div>
      <div className="p-6 space-y-3 text-sm font-mono">
        <div className="flex justify-between">
          <span className="text-neutral-500 group-hover:text-neutral-600">TOKEN</span>
          <a href={`https://basescan.org/token/${token.address}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {formatAddress(token.address)}
          </a>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500 group-hover:text-neutral-600">NFT</span>
          <a href={`https://basescan.org/token/${token.nft_collection}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {formatAddress(token.nft_collection)}
          </a>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500 group-hover:text-neutral-600">DEPLOYER</span>
          <span className="text-neutral-400 group-hover:text-neutral-600">{formatAddress(token.deployer)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t-2 border-current">
        <Link href={`/swap?token=${token.address}`} className="py-4 text-center text-sm uppercase tracking-widest border-r-2 border-current hover:bg-black hover:text-white transition-colors">SWAP</Link>
        <Link href={`/claim?token=${token.address}`} className="py-4 text-center text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors">CLAIM</Link>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tokens')
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setTokens(data.tokens || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="mb-12">
        <div className="text-xs text-neutral-500 mb-4 tracking-widest">TOKEN DIRECTORY</div>
        <h1 className="text-5xl font-bold">BROWSE TOKENS</h1>
        <div className="flex items-center gap-8 mt-6">
          <p className="text-neutral-400">All tokens deployed via cc0strategy</p>
          <div className="font-mono text-sm text-neutral-600">{tokens.length} TOKEN{tokens.length !== 1 ? 'S' : ''}</div>
        </div>
      </div>
      <div className="border-b-2 border-white mb-12" />
      {loading && <div className="border-2 border-white p-16 text-center"><div className="text-4xl mb-4 animate-pulse">◐</div><p className="text-neutral-400">Loading tokens...</p></div>}
      {error && !loading && <div className="border-2 border-neutral-600 p-8 text-center mb-12"><p className="text-neutral-400">Error: {error}</p></div>}
      {!loading && !error && tokens.length === 0 && <div className="border-2 border-white p-16 text-center"><div className="text-6xl mb-6">∅</div><h2 className="text-2xl font-bold mb-4">NO TOKENS YET</h2><Link href="/deploy" className="border-2 border-white px-8 py-3 hover:bg-white hover:text-black transition-colors">DEPLOY TOKEN</Link></div>}
      {!loading && !error && tokens.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens.map((token, index) => <TokenCard key={token.address} token={token} index={index} />)}
        </div>
      )}
    </div>
  );
}
