'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatEther, parseEther, encodeFunctionData } from 'viem';
import { useAccount, useConnect, useDisconnect, useChainId, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { SEAPORT_ADDRESS, SEAPORT_ABI, TREASURY, calculatePlatformFee } from '@/lib/seaport';

interface NFTData {
  tokenId: string;
  name: string;
  description: string | null;
  image: string | null;
  traits: Array<{ trait_type: string; value: string }>;
  collection: {
    address: string;
    name: string;
    symbol: string | null;
    totalSupply: number | null;
    imageUrl: string | null;
  };
  listing: {
    orderHash: string;
    price: string;
    seller: string;
    endTime: string;
    orderData: any;
  } | null;
  linkedToken: {
    address: string;
    symbol: string;
    name: string;
  } | null;
  history: Array<{
    eventType: string;
    price: string | null;
    from: string | null;
    to: string | null;
    txHash: string | null;
    timestamp: string | null;
  }>;
  chain: string;
}

const CHAIN_IDS: Record<string, number> = {
  base: 8453,
  ethereum: 1,
};

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatEth(wei: string): string {
  const eth = parseFloat(formatEther(BigInt(wei)));
  if (eth < 0.001) return '<0.001';
  return eth.toFixed(4);
}

function timeAgo(timestamp: string | null): string {
  if (!timestamp) return '—';
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

function TraitBadge({ trait }: { trait: { trait_type: string; value: string } }) {
  return (
    <div className="border border-neutral-700 p-2">
      <div className="text-[10px] text-neutral-500 uppercase">{trait.trait_type}</div>
      <div className="font-mono text-sm truncate">{trait.value}</div>
    </div>
  );
}

export default function NFTPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const address = params.address as string;
  const tokenId = params.tokenId as string;
  const chain = searchParams.get('chain') || 'base';
  
  const { isConnected, address: walletAddress } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const [nft, setNft] = useState<NFTData | null>(null);
  const [loading, setLoading] = useState(true);
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

  // Fetch NFT data
  useEffect(() => {
    const fetchNFT = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/nfts/token/${address}/${tokenId}?chain=${chain}`);
        if (res.ok) {
          const data = await res.json();
          setNft(data);
        }
      } catch (e) {
        console.error('Error fetching NFT:', e);
      }
      setLoading(false);
    };

    fetchNFT();
  }, [address, tokenId, chain]);

  // Handle buy
  const handleBuy = async () => {
    if (!nft?.listing || !walletAddress) return;
    
    setBuying(true);
    setBuyError(null);

    try {
      // Switch chain if needed
      if (!isCorrectChain) {
        await switchChain({ chainId: targetChainId });
        return;
      }

      const orderData = nft.listing.orderData;
      if (!orderData) {
        throw new Error('Order data not available');
      }

      // Calculate total value (price + platform fee already included in order)
      const priceWei = BigInt(nft.listing.price);
      
      // For Seaport fulfillBasicOrder, we need to send the exact consideration amount
      // The order data should contain all the info we need
      const totalValue = priceWei;

      // Build fulfillBasicOrder parameters
      // This is a simplified version - in production you'd use opensea-js
      const basicOrderParams = {
        considerationToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        considerationIdentifier: 0n,
        considerationAmount: priceWei,
        offerer: nft.listing.seller as `0x${string}`,
        zone: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        offerToken: address as `0x${string}`,
        offerIdentifier: BigInt(tokenId),
        offerAmount: 1n,
        basicOrderType: 0, // ETH_TO_ERC721
        startTime: BigInt(orderData.startTime || Math.floor(Date.now() / 1000) - 3600),
        endTime: BigInt(orderData.endTime || Math.floor(Date.now() / 1000) + 86400),
        zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        salt: BigInt(orderData.salt || '0'),
        offererConduitKey: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        fulfillerConduitKey: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        totalOriginalAdditionalRecipients: 1n, // Platform fee recipient
        additionalRecipients: [{
          amount: calculatePlatformFee(priceWei),
          recipient: TREASURY,
        }],
        signature: (orderData.signature || '0x') as `0x${string}`,
      };

      // Encode the function call
      const data = encodeFunctionData({
        abi: SEAPORT_ABI,
        functionName: 'fulfillBasicOrder_efficient_6GL6yc',
        args: [basicOrderParams],
      });

      // Send transaction
      sendTransaction({
        to: SEAPORT_ADDRESS,
        data,
        value: totalValue,
      });

    } catch (e: any) {
      console.error('Buy error:', e);
      setBuyError(e.message || 'Failed to buy NFT');
      setBuying(false);
    }
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      // Mark listing as filled
      fetch(`/api/marketplace/fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderHash: nft?.listing?.orderHash,
          filledBy: walletAddress,
          txHash,
        }),
      }).catch(console.error);
      
      // Refresh NFT data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [isConfirmed]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse">◐</div>
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">∅</div>
          <h1 className="text-2xl font-bold mb-2">NFT Not Found</h1>
          <Link href="/marketplace" className="text-neutral-500 hover:text-white">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = nft.image?.startsWith('ipfs://') 
    ? nft.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
    : nft.image;

  const isOwner = walletAddress?.toLowerCase() === nft.listing?.seller?.toLowerCase();

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-neutral-800">
        <div className="container-editorial py-4">
          <Link 
            href={`/collection/${address}?chain=${chain}`}
            className="text-neutral-500 hover:text-white text-sm"
          >
            ← Back to {nft.collection.name}
          </Link>
        </div>
      </div>

      <div className="container-editorial py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image */}
          <div>
            <div className="aspect-square bg-neutral-900 border-2 border-neutral-800 relative overflow-hidden">
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
                <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-neutral-700">
                  #{tokenId}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                <Link 
                  href={`/collection/${address}?chain=${chain}`}
                  className="hover:text-white"
                >
                  {nft.collection.name}
                </Link>
                <span className={`px-2 py-0.5 text-[10px] font-bold ${
                  chain === 'base' ? 'bg-blue-900/50 text-blue-400' : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {chain.toUpperCase()}
                </span>
              </div>
              <h1 className="font-editorial text-3xl md:text-4xl font-bold">{nft.name}</h1>
            </div>

            {/* Listing / Buy */}
            {nft.listing ? (
              <div className="border-2 border-white p-6">
                <div className="text-xs text-neutral-500 mb-2">PRICE</div>
                <div className="font-mono text-3xl font-bold mb-4">
                  {formatEth(nft.listing.price)} <span className="text-neutral-500">ETH</span>
                </div>
                
                <div className="text-xs text-neutral-500 mb-4">
                  Seller: {formatAddress(nft.listing.seller)}
                </div>

                {!isConnected ? (
                  <button
                    onClick={() => connect({ connector: injected() })}
                    className="w-full bg-white text-black py-4 font-bold text-lg hover:bg-neutral-200 transition-colors"
                  >
                    CONNECT WALLET TO BUY
                  </button>
                ) : isOwner ? (
                  <div className="text-center py-4 text-neutral-500">
                    This is your listing
                  </div>
                ) : !isCorrectChain ? (
                  <button
                    onClick={() => switchChain({ chainId: targetChainId })}
                    className="w-full bg-yellow-500 text-black py-4 font-bold text-lg hover:bg-yellow-400 transition-colors"
                  >
                    SWITCH TO {chain.toUpperCase()}
                  </button>
                ) : (
                  <button
                    onClick={handleBuy}
                    disabled={buying || isPending || isConfirming}
                    className="w-full bg-white text-black py-4 font-bold text-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    {isPending || isConfirming ? 'CONFIRMING...' : isConfirmed ? 'PURCHASED!' : 'BUY NOW'}
                  </button>
                )}

                {buyError && (
                  <div className="mt-4 text-red-500 text-sm">{buyError}</div>
                )}

                {isConfirmed && (
                  <div className="mt-4 text-green-500 text-sm">
                    Purchase successful! Refreshing...
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-neutral-800 p-6 text-center">
                <div className="text-neutral-500">Not listed for sale</div>
              </div>
            )}

            {/* Linked Token */}
            {nft.linkedToken && (
              <div className="border border-neutral-800 p-4">
                <div className="text-xs text-neutral-500 mb-2">LINKED CC0STRATEGY TOKEN</div>
                <Link 
                  href={`/swap?token=${nft.linkedToken.address}`}
                  className="flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold">{nft.linkedToken.name}</div>
                    <div className="text-green-400 font-mono">${nft.linkedToken.symbol}</div>
                  </div>
                  <span className="text-neutral-500 group-hover:text-white">
                    Trade →
                  </span>
                </Link>
              </div>
            )}

            {/* Description */}
            {nft.description && (
              <div>
                <h2 className="font-bold text-sm text-neutral-500 mb-2">DESCRIPTION</h2>
                <p className="text-neutral-300">{nft.description}</p>
              </div>
            )}

            {/* Traits */}
            {nft.traits.length > 0 && (
              <div>
                <h2 className="font-bold text-sm text-neutral-500 mb-3">TRAITS</h2>
                <div className="grid grid-cols-3 gap-2">
                  {nft.traits.map((trait, i) => (
                    <TraitBadge key={i} trait={trait} />
                  ))}
                </div>
              </div>
            )}

            {/* Activity */}
            {nft.history.length > 0 && (
              <div>
                <h2 className="font-bold text-sm text-neutral-500 mb-3">ACTIVITY</h2>
                <div className="border border-neutral-800 divide-y divide-neutral-800">
                  {nft.history.slice(0, 5).map((event, i) => (
                    <div key={i} className="p-3 flex items-center justify-between text-sm">
                      <div>
                        <span className="capitalize">{event.eventType}</span>
                        {event.from && event.to && (
                          <span className="text-neutral-500 ml-2">
                            {formatAddress(event.from)} → {formatAddress(event.to)}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        {event.price && <div className="font-mono">{formatEth(event.price)} Ξ</div>}
                        <div className="text-neutral-500 text-xs">{timeAgo(event.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
