'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatEther } from 'viem';

export interface NFTData {
  tokenId: string;
  name: string;
  image: string | null;
  traits?: Array<{ trait_type: string; value: string }>;
  listing?: {
    orderHash: string;
    price: string;
    seller: string;
    endTime: string;
    orderData?: any;
  } | null;
}

interface NFTCardProps {
  nft: NFTData;
  onClick: () => void;
}

function formatEth(wei: string): string {
  const eth = parseFloat(formatEther(BigInt(wei)));
  if (eth < 0.001) return '<0.001';
  return eth.toFixed(4);
}

export function NFTCard({ nft, onClick }: NFTCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const imageUrl = nft.image?.startsWith('ipfs://') 
    ? nft.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
    : nft.image;

  return (
    <button 
      onClick={onClick}
      className="border border-neutral-800 hover:border-white transition-all group bg-black text-left w-full"
    >
      {/* Image */}
      <div className="aspect-square bg-neutral-900 relative overflow-hidden">
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={nft.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-neutral-700">
            #{nft.tokenId}
          </div>
        )}
        
        {/* Listed badge */}
        {nft.listing && (
          <div className="absolute top-1 left-1 bg-green-500 text-black px-1.5 py-0.5 text-[9px] font-bold">
            LISTED
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-2 border-t border-neutral-800">
        <div className="font-mono text-xs truncate">{nft.name}</div>
        
        {nft.listing ? (
          <div className="mt-1 flex items-center justify-between">
            <div className="font-mono text-xs font-bold">{formatEth(nft.listing.price)} Ξ</div>
            <span className="text-[10px] text-green-500 group-hover:text-green-400">BUY →</span>
          </div>
        ) : (
          <div className="mt-1 text-neutral-600 text-[10px]">
            Not listed
          </div>
        )}
      </div>
    </button>
  );
}
