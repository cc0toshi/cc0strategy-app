// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { formatEther } from 'viem';
import { CONTRACTS } from '@/config/contracts';

// ABIs
const FEE_DISTRIBUTOR_ABI = [
  {
    name: 'tokenToCollection',
    type: 'function',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: 'nft', type: 'address' }],
    stateMutability: 'view',
  },
  {
    name: 'claimable',
    type: 'function',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'claimableMultiple',
    type: 'function',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'tokenIds', type: 'uint256[]' },
    ],
    outputs: [{ name: 'total', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'claim',
    type: 'function',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'tokenIds', type: 'uint256[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

const ERC721_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'ownerOf',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: 'owner', type: 'address' }],
    stateMutability: 'view',
  },
  {
    name: 'name',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

// Known tokens
const KNOWN_TOKENS = [
  { address: CONTRACTS.DICKSTR.TOKEN, symbol: 'DICKSTR' },
] as const;

interface NFTInfo {
  tokenId: bigint;
  claimable: bigint;
  selected: boolean;
  imageUrl?: string;
}

export default function ClaimPage() {
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  
  const [selectedToken, setSelectedToken] = useState<`0x${string}`>(CONTRACTS.DICKSTR.TOKEN);
  const [customToken, setCustomToken] = useState('');
  const [nftCollection, setNftCollection] = useState<`0x${string}` | null>(null);
  const [nfts, setNfts] = useState<NFTInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState<string>('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualTokenIds, setManualTokenIds] = useState('');
  
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Get NFT collection for selected token
  const { data: collectionAddress, refetch: refetchCollection } = useReadContract({
    address: CONTRACTS.FEE_DISTRIBUTOR,
    abi: FEE_DISTRIBUTOR_ABI,
    functionName: 'tokenToCollection',
    args: [selectedToken],
  });

  // Update NFT collection when it changes
  useEffect(() => {
    if (collectionAddress && collectionAddress !== '0x0000000000000000000000000000000000000000') {
      setNftCollection(collectionAddress);
    } else {
      setNftCollection(null);
      setNfts([]);
    }
  }, [collectionAddress]);

  // Fetch owned token IDs and images from OpenSea API
  const fetchNFTsFromOpenSea = async (userAddr: string, collectionAddr: string): Promise<{tokenIds: string[], images: Record<string, string>} | null> => {
    try {
      const response = await fetch(
        `/api/nfts?address=${userAddr}&collection=${collectionAddr}&includeImages=true`
      );
      
      if (!response.ok) {
        const data = await response.json();
        console.log('OpenSea API error:', data.error);
        return null;
      }
      
      const data = await response.json();
      return {
        tokenIds: data.tokenIds || [],
        images: data.images || {}
      };
    } catch (err) {
      console.log('Failed to fetch from OpenSea:', err);
      return null;
    }
  };

  // Fetch user's NFTs and their claimable amounts
  const fetchUserNFTs = useCallback(async () => {
    if (!address || !nftCollection || !publicClient) return;
    
    setLoading(true);
    setError(null);
    setLoadingProgress('');
    setShowManualEntry(false);
    
    try {
      // Get collection name
      try {
        const name = await publicClient.readContract({
          address: nftCollection,
          abi: ERC721_ABI,
          functionName: 'name',
        });
        setCollectionName(name);
      } catch {
        setCollectionName('NFT Collection');
      }

      setLoadingProgress('Scanning wallet for NFTs...');
      
      // Fetch token IDs and images from OpenSea API
      const result = await fetchNFTsFromOpenSea(address, nftCollection);
      
      // If OpenSea API fails, show manual entry
      if (result === null) {
        setShowManualEntry(true);
        setError('Auto-detection unavailable. Enter token IDs manually.');
        setLoading(false);
        return;
      }
      
      const { tokenIds: tokenIdStrings, images } = result;
      
      if (tokenIdStrings.length === 0) {
        setNfts([]);
        setLoading(false);
        return;
      }
      
      // Convert to bigints
      const tokenIds = tokenIdStrings.map(id => BigInt(id));
      
      setLoadingProgress('Calculating rewards...');
      
      // Get claimable amount for each NFT
      const nftInfos: NFTInfo[] = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const claimable = await publicClient.readContract({
            address: CONTRACTS.FEE_DISTRIBUTOR,
            abi: FEE_DISTRIBUTOR_ABI,
            functionName: 'claimable',
            args: [selectedToken, tokenId],
          });
          return {
            tokenId,
            claimable,
            selected: claimable > 0n,
            imageUrl: images[tokenId.toString()],
          };
        })
      );
      
      setNfts(nftInfos);
    } catch (err) {
      console.error('Failed to fetch NFTs:', err);
      setError('Failed to load NFTs. Try manual entry.');
      setShowManualEntry(true);
    }
    
    setLoading(false);
    setLoadingProgress('');
  }, [address, nftCollection, publicClient, selectedToken]);

  // Handle manual token ID entry
  const handleManualEntry = async () => {
    if (!address || !nftCollection || !publicClient || !manualTokenIds.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Parse token IDs (comma or space separated)
      const tokenIds = manualTokenIds
        .split(/[\s,]+/)
        .map(s => s.trim())
        .filter(s => /^\d+$/.test(s))
        .map(s => BigInt(s));
      
      if (tokenIds.length === 0) {
        setError('Enter valid token IDs separated by commas');
        setLoading(false);
        return;
      }
      
      // Verify ownership and get claimable amounts
      const nftInfos: NFTInfo[] = [];
      
      for (const tokenId of tokenIds) {
        try {
          const owner = await publicClient.readContract({
            address: nftCollection,
            abi: ERC721_ABI,
            functionName: 'ownerOf',
            args: [tokenId],
          });
          
          if (owner.toLowerCase() === address.toLowerCase()) {
            const claimable = await publicClient.readContract({
              address: CONTRACTS.FEE_DISTRIBUTOR,
              abi: FEE_DISTRIBUTOR_ABI,
              functionName: 'claimable',
              args: [selectedToken, tokenId],
            });
            nftInfos.push({
              tokenId,
              claimable,
              selected: claimable > 0n,
            });
          }
        } catch {
          // Token doesn't exist or other error, skip it
        }
      }
      
      if (nftInfos.length === 0) {
        setError('None of these tokens are in your wallet');
      } else {
        setNfts(nftInfos);
        setShowManualEntry(false);
        setError(null);
      }
    } catch (err) {
      console.error('Manual entry failed:', err);
      setError('Failed to verify ownership');
    }
    
    setLoading(false);
  };

  // Refetch NFTs when collection or address changes
  useEffect(() => {
    if (nftCollection && address) {
      fetchUserNFTs();
    }
  }, [nftCollection, address, fetchUserNFTs]);

  // Refetch after successful claim
  useEffect(() => {
    if (isSuccess) {
      fetchUserNFTs();
    }
  }, [isSuccess, fetchUserNFTs]);

  // Calculate totals
  const selectedNfts = nfts.filter(n => n.selected);
  const totalClaimable = selectedNfts.reduce((sum, n) => sum + n.claimable, 0n);
  const totalPending = nfts.reduce((sum, n) => sum + n.claimable, 0n);

  // Toggle NFT selection
  const toggleNFT = (tokenId: bigint) => {
    setNfts(prev => prev.map(n => 
      n.tokenId === tokenId ? { ...n, selected: !n.selected } : n
    ));
  };

  // Select all / deselect all
  const selectAll = () => {
    setNfts(prev => prev.map(n => ({ ...n, selected: n.claimable > 0n })));
  };

  const deselectAll = () => {
    setNfts(prev => prev.map(n => ({ ...n, selected: false })));
  };

  // Claim selected NFTs
  const handleClaim = () => {
    if (selectedNfts.length === 0) return;
    writeContract({
      address: CONTRACTS.FEE_DISTRIBUTOR,
      abi: FEE_DISTRIBUTOR_ABI,
      functionName: 'claim',
      args: [selectedToken, selectedNfts.map(n => n.tokenId)],
    });
  };

  // Handle custom token input
  const handleCustomToken = () => {
    if (customToken.startsWith('0x') && customToken.length === 42) {
      setSelectedToken(customToken as `0x${string}`);
      refetchCollection();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="border-b-2 border-white">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
            CLAIM
          </h1>
          <p className="text-xl md:text-2xl text-neutral-400 font-medium max-w-xl">
            NFT holders earn 80% of protocol trading fees. Claim your WETH rewards.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Connect Wallet State */}
        {!isConnected ? (
          <div className="border-2 border-white p-12 md:p-16 text-center">
            <div className="w-20 h-20 border-2 border-white mx-auto mb-8 flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-4">CONNECT WALLET</h2>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto">
              Connect your wallet to view NFTs and claim accumulated rewards
            </p>
            <button 
              onClick={() => connect({ connector: injected() })} 
              className="bg-white text-black px-12 py-4 text-lg font-bold tracking-wide hover:bg-neutral-200 transition-colors"
            >
              CONNECT
            </button>
          </div>
        ) : (
          <>
            {/* Wallet Bar */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-neutral-800">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <span className="font-mono text-lg tracking-tight">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              <button 
                onClick={() => disconnect()} 
                className="text-neutral-500 hover:text-white font-medium transition-colors"
              >
                Disconnect
              </button>
            </div>

            {/* Token Selector */}
            <div className="mb-10">
              <label className="block text-xs font-bold tracking-widest text-neutral-500 mb-3">
                SELECT TOKEN
              </label>
              <div className="flex gap-3">
                <select 
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value as `0x${string}`)}
                  className="flex-1 border-2 border-white px-5 py-4 bg-black text-white font-bold text-lg appearance-none cursor-pointer hover:bg-neutral-900 transition-colors"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5rem' }}
                >
                  {KNOWN_TOKENS.map(t => (
                    <option key={t.address} value={t.address}>{t.symbol}</option>
                  ))}
                  <option value="custom">Custom Token</option>
                </select>
              </div>
              
              {selectedToken === ('custom' as `0x${string}`) && (
                <div className="mt-4 flex gap-3">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    className="flex-1 border-2 border-white bg-black px-5 py-4 font-mono text-lg placeholder:text-neutral-600"
                  />
                  <button 
                    onClick={handleCustomToken}
                    className="bg-white text-black px-8 py-4 font-bold hover:bg-neutral-200 transition-colors"
                  >
                    LOAD
                  </button>
                </div>
              )}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="border-2 border-white p-16 text-center">
                <div className="inline-flex flex-col items-center">
                  <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 border-2 border-neutral-700"></div>
                    <div className="absolute inset-0 border-2 border-white border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-lg font-medium text-neutral-400">{loadingProgress || 'Loading...'}</p>
                </div>
              </div>
            )}

            {/* Manual Entry Section */}
            {showManualEntry && !loading && (
              <div className="border-2 border-white p-8 md:p-12 mb-8">
                <h3 className="text-xl font-black mb-2">MANUAL ENTRY</h3>
                <p className="text-neutral-500 mb-6">{error || 'Enter your token IDs below'}</p>
                <textarea
                  value={manualTokenIds}
                  onChange={(e) => setManualTokenIds(e.target.value)}
                  placeholder="1, 42, 420, 1337"
                  className="w-full border-2 border-white bg-black px-5 py-4 mb-6 h-32 resize-none font-mono text-lg placeholder:text-neutral-600 focus:outline-none"
                />
                <div className="flex gap-4">
                  <button
                    onClick={handleManualEntry}
                    className="flex-1 bg-white text-black py-4 font-bold text-lg hover:bg-neutral-200 transition-colors"
                  >
                    VERIFY OWNERSHIP
                  </button>
                  <button
                    onClick={() => {
                      setShowManualEntry(false);
                      setError(null);
                      fetchUserNFTs();
                    }}
                    className="px-8 py-4 border-2 border-white font-bold hover:bg-white hover:text-black transition-colors"
                  >
                    RETRY
                  </button>
                </div>
              </div>
            )}

            {/* No Collection State */}
            {!loading && !nftCollection && !showManualEntry && (
              <div className="border-2 border-neutral-700 border-dashed p-16 text-center">
                <div className="w-16 h-16 border-2 border-neutral-700 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-3xl text-neutral-600">∅</span>
                </div>
                <p className="text-xl font-medium text-neutral-500">No collection linked to this token</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && nftCollection && nfts.length === 0 && !showManualEntry && !error && (
              <div className="border-2 border-neutral-700 border-dashed p-16 text-center">
                <div className="w-16 h-16 border-2 border-neutral-700 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-3xl text-neutral-600">◇</span>
                </div>
                <p className="text-xl font-medium text-neutral-500 mb-2">No NFTs found</p>
                <p className="text-neutral-600 mb-6">{collectionName}</p>
                <button
                  onClick={() => setShowManualEntry(true)}
                  className="text-white font-bold underline underline-offset-4 hover:no-underline"
                >
                  Enter token IDs manually
                </button>
              </div>
            )}

            {/* NFT Grid */}
            {!loading && nfts.length > 0 && !showManualEntry && (
              <>
                {/* Collection Header */}
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <p className="text-xs font-bold tracking-widest text-neutral-500 mb-1">COLLECTION</p>
                    <h3 className="text-2xl font-black">{collectionName}</h3>
                  </div>
                  <div className="flex gap-4 text-sm font-bold">
                    <button onClick={selectAll} className="text-neutral-500 hover:text-white transition-colors">
                      SELECT ALL
                    </button>
                    <button onClick={deselectAll} className="text-neutral-500 hover:text-white transition-colors">
                      CLEAR
                    </button>
                  </div>
                </div>

                {/* NFT Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
                  {nfts.map((nft) => (
                    <div 
                      key={nft.tokenId.toString()} 
                      onClick={() => toggleNFT(nft.tokenId)}
                      className={`
                        relative border-2 cursor-pointer transition-all overflow-hidden
                        ${nft.selected 
                          ? 'border-white bg-white text-black' 
                          : 'border-neutral-700 hover:border-white bg-black'
                        }
                      `}
                    >
                      {/* NFT Image */}
                      {nft.imageUrl ? (
                        <div className="aspect-square w-full">
                          <img 
                            src={nft.imageUrl} 
                            alt={`#${nft.tokenId.toString()}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`aspect-square w-full flex items-center justify-center ${nft.selected ? 'bg-neutral-200' : 'bg-neutral-900'}`}>
                          <span className={`text-4xl font-black ${nft.selected ? 'text-neutral-400' : 'text-neutral-700'}`}>
                            #{nft.tokenId.toString()}
                          </span>
                        </div>
                      )}
                      
                      {/* Info Overlay */}
                      <div className="p-4">
                        {/* Selection Indicator */}
                        <div className={`
                          absolute top-3 right-3 w-6 h-6 border-2 flex items-center justify-center
                          ${nft.selected ? 'border-black bg-black' : 'border-white/50 bg-black/50'}
                        `}>
                          {nft.selected && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="square" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Token ID */}
                        <p className="font-mono text-lg font-black mb-1">
                          #{nft.tokenId.toString()}
                        </p>
                        
                        {/* Claimable Amount */}
                        <p className={`text-xs font-bold tracking-wide mb-1 ${nft.selected ? 'text-black/50' : 'text-neutral-500'}`}>
                          CLAIMABLE
                        </p>
                        <p className={`font-mono text-sm font-bold ${nft.claimable > 0n ? '' : (nft.selected ? 'text-black/40' : 'text-neutral-600')}`}>
                          {formatEther(nft.claimable)} WETH
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Box */}
                <div className="border-2 border-white p-8 mb-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs font-bold tracking-widest text-neutral-500 mb-2">TOTAL PENDING</p>
                      <p className="font-mono text-2xl md:text-3xl font-black">{formatEther(totalPending)}</p>
                      <p className="text-sm font-bold text-neutral-500">WETH across {nfts.length} NFTs</p>
                    </div>
                    <div className="md:text-right">
                      <p className="text-xs font-bold tracking-widest text-neutral-500 mb-2">SELECTED TO CLAIM</p>
                      <p className="font-mono text-2xl md:text-3xl font-black">{formatEther(totalClaimable)}</p>
                      <p className="text-sm font-bold text-neutral-500">WETH from {selectedNfts.length} NFTs</p>
                    </div>
                  </div>
                </div>

                {/* Claim Button */}
                <button
                  onClick={handleClaim}
                  disabled={isPending || isConfirming || selectedNfts.length === 0 || totalClaimable === 0n}
                  className={`
                    w-full py-6 text-xl font-black tracking-wide transition-all
                    ${isPending || isConfirming || selectedNfts.length === 0 || totalClaimable === 0n
                      ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                      : 'bg-white text-black hover:bg-neutral-200'
                    }
                  `}
                >
                  {isPending || isConfirming 
                    ? 'PROCESSING...' 
                    : selectedNfts.length === 0 
                      ? 'SELECT NFTS TO CLAIM'
                      : totalClaimable === 0n
                        ? 'NO REWARDS AVAILABLE'
                        : `CLAIM ${selectedNfts.length} NFT${selectedNfts.length > 1 ? 'S' : ''}`
                  }
                </button>

                {/* Transaction Status */}
                {txHash && (
                  <div className="mt-6 p-6 border border-neutral-800">
                    <a 
                      href={`https://basescan.org/tx/${txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 font-mono text-neutral-400 hover:text-white transition-colors"
                    >
                      <span className="text-sm">VIEW ON BASESCAN</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}

                {/* Success Message */}
                {isSuccess && (
                  <div className="mt-6 border-2 border-white bg-white text-black p-6 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="square" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xl font-black">CLAIMED SUCCESSFULLY</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-neutral-800 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <p className="text-neutral-500 font-medium">
            80% of trading fees → NFT holders · Rewards accumulate per NFT · Claim anytime
          </p>
        </div>
      </div>
    </div>
  );
}
