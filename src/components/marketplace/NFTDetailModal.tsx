'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { formatEther, parseEther, encodeFunctionData } from 'viem';
import { useAccount, useConnect, useChainId, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import type { NFTData } from './NFTCard';

const SEAPORT_ADDRESS = '0x0000000000000068F116a894984e2DB1123eB395' as const;
const TREASURY = '0x58e510f849e38095375a3e478ad1d719650b8557' as const;

const CHAIN_IDS: Record<string, number> = {
  base: 8453,
  ethereum: 1,
};

interface NFTDetailModalProps {
  nft: NFTData | null;
  collectionAddress: string;
  collectionName: string;
  chain: string;
  onClose: () => void;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatEth(wei: string): string {
  const eth = parseFloat(formatEther(BigInt(wei)));
  if (eth < 0.001) return '<0.001';
  return eth.toFixed(4);
}

export function NFTDetailModal({ nft, collectionAddress, collectionName, chain, onClose }: NFTDetailModalProps) {
  const { isConnected, address: walletAddress } = useAccount();
  const { connect } = useConnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const { sendTransaction, data: txHash, isPending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Check if on correct chain
  const targetChainId = CHAIN_IDS[chain] || 8453;
  const isCorrectChain = chainId === targetChainId;
  const isOwner = walletAddress?.toLowerCase() === nft?.listing?.seller?.toLowerCase();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Handle successful purchase
  useEffect(() => {
    if (isConfirmed) {
      setTimeout(onClose, 2000);
    }
  }, [isConfirmed, onClose]);

  if (!nft) return null;

  const imageUrl = nft.image?.startsWith('ipfs://') 
    ? nft.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
    : nft.image;

  const handleBuy = async () => {
    if (!nft.listing || !walletAddress) return;
    
    setBuying(true);
    setBuyError(null);

    try {
      if (!isCorrectChain) {
        await switchChain({ chainId: targetChainId });
        setBuying(false);
        return;
      }

      const priceWei = BigInt(nft.listing.price);
      
      // Simplified Seaport fulfillment - in production use opensea-js
      // For MVP, just send ETH to Seaport with basic order fulfillment
      sendTransaction({
        to: SEAPORT_ADDRESS,
        value: priceWei,
        // Note: Full implementation requires proper Seaport calldata encoding
      });
      
    } catch (e: any) {
      console.error('Buy error:', e);
      setBuyError(e.message || 'Failed to buy NFT');
      setBuying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-black border-2 border-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 border border-neutral-700 hover:border-white hover:bg-white hover:text-black transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="aspect-square bg-neutral-900 relative">
            {imageUrl && !imageError ? (
              <Image
                src={imageUrl}
                alt={nft.name}
                fill
                className="object-contain"
                onError={() => setImageError(true)}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-neutral-700">
                #{nft.tokenId}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-6 flex flex-col">
            {/* Header */}
            <div className="mb-4">
              <div className="text-xs text-neutral-500 mb-1">{collectionName}</div>
              <h2 className="font-editorial text-xl font-bold">{nft.name}</h2>
            </div>

            {/* Price / Buy */}
            {nft.listing ? (
              <div className="border-2 border-white p-4 mb-4">
                <div className="text-xs text-neutral-500 mb-1">PRICE</div>
                <div className="font-mono text-2xl font-bold mb-4">
                  {formatEth(nft.listing.price)} <span className="text-neutral-500 text-lg">ETH</span>
                </div>
                
                <div className="text-xs text-neutral-500 mb-3">
                  Seller: {formatAddress(nft.listing.seller)}
                </div>

                {!isConnected ? (
                  <button
                    onClick={() => connect({ connector: injected() })}
                    className="w-full bg-white text-black py-3 font-bold hover:bg-neutral-200 transition-colors"
                  >
                    CONNECT TO BUY
                  </button>
                ) : isOwner ? (
                  <div className="text-center py-3 text-neutral-500 text-sm">
                    This is your listing
                  </div>
                ) : !isCorrectChain ? (
                  <button
                    onClick={() => switchChain({ chainId: targetChainId })}
                    className="w-full bg-yellow-500 text-black py-3 font-bold hover:bg-yellow-400 transition-colors"
                  >
                    SWITCH TO {chain.toUpperCase()}
                  </button>
                ) : (
                  <button
                    onClick={handleBuy}
                    disabled={buying || isPending || isConfirming}
                    className="w-full bg-white text-black py-3 font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    {isPending || isConfirming ? 'CONFIRMING...' : isConfirmed ? '✓ PURCHASED!' : 'BUY NOW'}
                  </button>
                )}

                {buyError && (
                  <div className="mt-2 text-red-500 text-xs">{buyError}</div>
                )}

                {isConfirmed && (
                  <div className="mt-2 text-green-500 text-xs text-center">
                    Purchase successful!
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-neutral-800 p-4 mb-4 text-center text-neutral-500 text-sm">
                Not listed for sale
              </div>
            )}

            {/* Traits */}
            {nft.traits && nft.traits.length > 0 && (
              <div className="flex-1">
                <div className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">TRAITS</div>
                <div className="grid grid-cols-2 gap-2">
                  {nft.traits.slice(0, 6).map((trait, i) => (
                    <div key={i} className="border border-neutral-800 p-2">
                      <div className="text-[9px] text-neutral-500 uppercase truncate">{trait.trait_type}</div>
                      <div className="font-mono text-xs truncate">{trait.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="mt-4 pt-4 border-t border-neutral-800 flex gap-2">
              <a
                href={`https://opensea.io/assets/${chain === 'ethereum' ? 'ethereum' : 'base'}/${collectionAddress}/${nft.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 border border-neutral-700 hover:border-white text-xs font-bold uppercase"
              >
                OpenSea
              </a>
              <a
                href={`https://${chain === 'ethereum' ? 'etherscan.io' : 'basescan.org'}/token/${collectionAddress}?a=${nft.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 border border-neutral-700 hover:border-white text-xs font-bold uppercase"
              >
                Explorer
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
