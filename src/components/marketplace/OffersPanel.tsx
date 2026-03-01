// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useSendTransaction } from 'wagmi';
import { formatEther, type Hex } from 'viem';

interface Offer {
  id: string;
  order_hash: string;
  offerer: string;
  amount_wei: string;
  end_time: string;
  order_data: any;
  signature: string;
  status: string;
  created_at: string;
  is_collection_offer?: boolean;
  source?: string;
  protocol_address?: string;
}

interface OffersPanelProps {
  collectionAddress: string;
  tokenId: string;
  chain: string;
  ownerAddress?: string;
  onOfferAccepted?: () => void;
}

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer-production-812c.up.railway.app';
const SEAPORT_ADDRESS = '0x0000000000000068F116a894984e2DB1123eB395' as const;

// Seaport ABI for fulfillOrder
const SEAPORT_FULFILL_ABI = [
  {
    name: 'fulfillOrder',
    type: 'function',
    inputs: [
      {
        name: 'order',
        type: 'tuple',
        components: [
          {
            name: 'parameters',
            type: 'tuple',
            components: [
              { name: 'offerer', type: 'address' },
              { name: 'zone', type: 'address' },
              {
                name: 'offer',
                type: 'tuple[]',
                components: [
                  { name: 'itemType', type: 'uint8' },
                  { name: 'token', type: 'address' },
                  { name: 'identifierOrCriteria', type: 'uint256' },
                  { name: 'startAmount', type: 'uint256' },
                  { name: 'endAmount', type: 'uint256' },
                ],
              },
              {
                name: 'consideration',
                type: 'tuple[]',
                components: [
                  { name: 'itemType', type: 'uint8' },
                  { name: 'token', type: 'address' },
                  { name: 'identifierOrCriteria', type: 'uint256' },
                  { name: 'startAmount', type: 'uint256' },
                  { name: 'endAmount', type: 'uint256' },
                  { name: 'recipient', type: 'address' },
                ],
              },
              { name: 'orderType', type: 'uint8' },
              { name: 'startTime', type: 'uint256' },
              { name: 'endTime', type: 'uint256' },
              { name: 'zoneHash', type: 'bytes32' },
              { name: 'salt', type: 'uint256' },
              { name: 'conduitKey', type: 'bytes32' },
              { name: 'totalOriginalConsiderationItems', type: 'uint256' },
            ],
          },
          { name: 'signature', type: 'bytes' },
        ],
      },
      { name: 'fulfillerConduitKey', type: 'bytes32' },
    ],
    outputs: [{ name: 'fulfilled', type: 'bool' }],
    stateMutability: 'payable',
  },
] as const;

function formatAddress(addr: string): string {
  if (!addr) return 'Unknown';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTimeRemaining(endTime: string): string {
  if (!endTime) return '';
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m left`;
  }
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

export function OffersPanel({ collectionAddress, tokenId, chain, ownerAddress, onOfferAccepted }: OffersPanelProps) {
  const { address } = useAccount();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptStatus, setAcceptStatus] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const isOwner = address && ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase();

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await fetch(
          `/api/marketplace/offers/${collectionAddress}/${tokenId}?chain=${chain}`
        );
        if (res.ok) {
          const data = await res.json();
          // Offers are already filtered and sorted by the API
          setOffers(data.offers || []);
        }
      } catch (e) {
        console.error('Error fetching offers:', e);
      }
      setLoading(false);
    };

    fetchOffers();
    const interval = setInterval(fetchOffers, 30000);
    return () => clearInterval(interval);
  }, [collectionAddress, tokenId, chain]);

  const acceptOffer = async (offer: Offer) => {
    if (!address || accepting) return;
    
    setAccepting(offer.order_hash);
    setError(null);
    setAcceptStatus('Preparing...');

    try {
      // For OpenSea offers (especially collection offers), use OpenSea fulfillment API
      if (offer.source === 'opensea') {
        setAcceptStatus('Getting fulfillment data...');
        
        // Call OpenSea's offer fulfillment API via our indexer
        const fulfillRes = await fetch(`${INDEXER_URL}/marketplace/opensea/fulfill-offer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderHash: offer.order_hash,
            chain: chain === 'ethereum' ? 'ethereum' : 'base',
            fulfiller: address,
            tokenId: tokenId,
            collectionAddress: collectionAddress,
            isCollectionOffer: offer.is_collection_offer,
          }),
        });

        if (fulfillRes.ok) {
          const fulfillData = await fulfillRes.json();
          if (fulfillData.transaction) {
            setAcceptStatus('Confirm in wallet...');
            await sendTransactionAsync({
              to: fulfillData.transaction.to as Hex,
              value: BigInt(fulfillData.transaction.value || '0'),
              data: fulfillData.transaction.data as Hex,
            });
            onOfferAccepted?.();
            return;
          }
        }
        
        // Fallback: try direct Seaport if fulfillment API fails
        console.log('Fulfillment API failed, trying direct Seaport...');
      }

      // Direct Seaport fulfillment for our own offers or as fallback
      if (offer.order_data) {
        setAcceptStatus('Confirm in wallet...');
        await writeContractAsync({
          address: SEAPORT_ADDRESS,
          abi: SEAPORT_FULFILL_ABI,
          functionName: 'fulfillOrder',
          args: [
            {
              parameters: offer.order_data,
              signature: (offer.signature || '0x') as `0x${string}`,
            },
            '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          ],
        });

        // Mark offer as filled in indexer
        await fetch(`${INDEXER_URL}/marketplace/offers/${offer.order_hash}/fill`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filledBy: address }),
        });

        onOfferAccepted?.();
      } else {
        throw new Error('Missing order data for this offer');
      }
    } catch (e: any) {
      console.error('Error accepting offer:', e);
      setError(e.shortMessage || e.message || 'Failed to accept offer');
    } finally {
      setAccepting(null);
      setAcceptStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">Loading offers...</div>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="p-4 text-center text-neutral-500 text-sm">
        No active offers on this NFT
      </div>
    );
  }

  // Separate item offers and collection offers for display
  const itemOffers = offers.filter(o => !o.is_collection_offer);
  const collectionOffers = offers.filter(o => o.is_collection_offer);

  return (
    <div className="divide-y divide-neutral-800">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Item-specific offers */}
      {itemOffers.length > 0 && (
        <div>
          <div className="px-3 py-2 bg-neutral-900 text-[10px] text-neutral-400 uppercase tracking-wider">
            Offers for this NFT ({itemOffers.length})
          </div>
          {itemOffers.map((offer) => (
            <OfferRow 
              key={offer.order_hash} 
              offer={offer} 
              isOwner={isOwner}
              accepting={accepting}
              acceptStatus={acceptStatus}
              onAccept={acceptOffer}
            />
          ))}
        </div>
      )}

      {/* Collection-wide offers */}
      {collectionOffers.length > 0 && (
        <div>
          <div className="px-3 py-2 bg-neutral-900 text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <span className="text-yellow-500">⚡</span>
            Collection Offers ({collectionOffers.length})
            <span className="text-neutral-500">- accepts any NFT</span>
          </div>
          {collectionOffers.map((offer) => (
            <OfferRow 
              key={offer.order_hash} 
              offer={offer} 
              isOwner={isOwner}
              accepting={accepting}
              acceptStatus={acceptStatus}
              onAccept={acceptOffer}
              isCollectionOffer
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Separate component for offer rows
function OfferRow({ 
  offer, 
  isOwner, 
  accepting, 
  acceptStatus,
  onAccept,
  isCollectionOffer = false 
}: { 
  offer: Offer; 
  isOwner: boolean | undefined; 
  accepting: string | null;
  acceptStatus: string | null;
  onAccept: (offer: Offer) => void;
  isCollectionOffer?: boolean;
}) {
  const isAccepting = accepting === offer.order_hash;
  
  return (
    <div className={`p-3 flex items-center justify-between gap-4 ${isCollectionOffer ? 'bg-yellow-500/5' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold">
            {formatEther(BigInt(offer.amount_wei))} WETH
          </span>
          {offer.end_time && (
            <span className="text-neutral-500 text-xs">
              {formatTimeRemaining(offer.end_time)}
            </span>
          )}
          {isCollectionOffer && (
            <span className="text-yellow-500 text-[9px] uppercase bg-yellow-500/10 px-1 py-0.5 rounded">
              Collection
            </span>
          )}
        </div>
        <div className="text-neutral-500 text-xs mt-0.5">
          by {formatAddress(offer.offerer)}
          {offer.source === 'opensea' && (
            <span className="text-neutral-600 ml-1">via OpenSea</span>
          )}
        </div>
      </div>
      
      {isOwner && (
        <button
          onClick={() => onAccept(offer)}
          disabled={!!accepting}
          className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
            isAccepting
              ? 'bg-neutral-800 text-neutral-500'
              : 'bg-green-500 text-black hover:bg-green-400'
          }`}
        >
          {isAccepting ? (acceptStatus || 'Accepting...') : 'Accept'}
        </button>
      )}
    </div>
  );
}
