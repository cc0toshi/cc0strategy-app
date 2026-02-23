// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseEther, formatEther, keccak256, concat, pad, toHex, hexToBigInt, parseAbi, encodeAbiParameters, maxUint128 } from 'viem';
import { CONTRACTS } from '@/config/contracts';

// ABIs
const ERC20_ABI = [
  { name: 'symbol', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
  { name: 'name', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
] as const;

const FACTORY_ABI = [
  {
    name: 'TokenCreated',
    type: 'event',
    inputs: [
      { name: 'msgSender', type: 'address', indexed: false },
      { name: 'tokenAddress', type: 'address', indexed: true },
      { name: 'tokenAdmin', type: 'address', indexed: true },
      { name: 'tokenImage', type: 'string', indexed: false },
      { name: 'tokenName', type: 'string', indexed: false },
      { name: 'tokenSymbol', type: 'string', indexed: false },
      { name: 'tokenMetadata', type: 'string', indexed: false },
      { name: 'tokenContext', type: 'string', indexed: false },
      { name: 'startingTick', type: 'int24', indexed: false },
      { name: 'poolHook', type: 'address', indexed: false },
      { name: 'poolId', type: 'bytes32', indexed: true },
      { name: 'poolPairedToken', type: 'address', indexed: false },
      { name: 'poolTickSpacing', type: 'int24', indexed: false },
      { name: 'lockerAddress', type: 'address', indexed: false },
    ],
  },
] as const;

const EXTSLOAD_ABI = parseAbi([
  'function extsload(bytes32 slot) view returns (bytes32)',
]);

const UNIVERSAL_ROUTER_ABI = [
  {
    name: 'execute',
    type: 'function',
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

// Token info interface
interface TokenInfo {
  address: `0x${string}`;
  symbol: string;
  name: string;
  poolId: `0x${string}`;
}

// Constants
const POOLS_SLOT = 6n;
const Q96 = BigInt(2 ** 96);
const UNIVERSAL_ROUTER = '0x6fF5693b99212Da76ad316178A184AB56D299b43' as const;

// Universal Router command codes
const WRAP_ETH = 0x0b;
const V4_SWAP = 0x10;

// V4 action codes
const SWAP_EXACT_IN_SINGLE = 0x06;
const SETTLE_ALL = 0x0c;
const TAKE_ALL = 0x0f;

// ADDRESS_THIS constant for Universal Router (keeps funds in router)
const ADDRESS_THIS = '0x0000000000000000000000000000000000000002' as `0x${string}`;

// Price limits for Uniswap V4 swaps
const MIN_SQRT_PRICE = BigInt('4295128740'); // MIN_SQRT_PRICE + 1 for safety
const MAX_SQRT_PRICE = BigInt('1461446703485210103287273052203988822378723970340'); // MAX_SQRT_PRICE - 1

// DICKSTR pool constants
const DICKSTR_POOL = {
  currency0: '0x3b68c3b4e22e35faf5841d1b5eef8404d5a3b663' as `0x${string}`,
  currency1: '0x4200000000000000000000000000000000000006' as `0x${string}`, // WETH
  fee: 0x800000,
  tickSpacing: 200,
  hooks: '0x18ad8c9b72d33e69d8f02fda61e3c7fae4e728cc' as `0x${string}`,
};

export default function SwapPage() {
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [ethAmount, setEthAmount] = useState('0.001');
  const [quoteAmount, setQuoteAmount] = useState<string | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [swapDirection, setSwapDirection] = useState<'buy' | 'sell'>('buy');
  const [error, setError] = useState<string | null>(null);
  
  const { writeContract, data: txHash, isPending, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Load tokens from factory events
  useEffect(() => {
    const loadTokens = async () => {
      if (!publicClient) return;
      
      setIsLoadingTokens(true);
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACTS.FACTORY,
          event: FACTORY_ABI[0],
          fromBlock: 'earliest',
          toBlock: 'latest',
        });

        const tokenList: TokenInfo[] = [];
        
        for (const log of logs) {
          const args = log.args as any;
          if (args.tokenAddress && args.poolId) {
            try {
              const symbol = await publicClient.readContract({
                address: args.tokenAddress,
                abi: ERC20_ABI,
                functionName: 'symbol',
              });
              
              const name = await publicClient.readContract({
                address: args.tokenAddress,
                abi: ERC20_ABI,
                functionName: 'name',
              });
              
              tokenList.push({
                address: args.tokenAddress,
                symbol: symbol as string,
                name: name as string,
                poolId: args.poolId,
              });
            } catch (e) {
              console.error('Error loading token info:', e);
            }
          }
        }

        if (tokenList.length === 0) {
          tokenList.push({
            address: CONTRACTS.DICKSTR.TOKEN,
            symbol: 'DICKSTR',
            name: 'DICKSTR',
            poolId: CONTRACTS.DICKSTR.POOL_ID,
          });
        }

        setTokens(tokenList);
        setSelectedToken(tokenList[0] || null);
      } catch (e) {
        console.error('Error loading tokens:', e);
        const fallbackToken = {
          address: CONTRACTS.DICKSTR.TOKEN,
          symbol: 'DICKSTR',
          name: 'DICKSTR',
          poolId: CONTRACTS.DICKSTR.POOL_ID,
        };
        setTokens([fallbackToken]);
        setSelectedToken(fallbackToken);
      }
      setIsLoadingTokens(false);
    };

    loadTokens();
  }, [publicClient]);

  // Calculate quote from sqrtPriceX96
  const calculateQuote = useCallback(async () => {
    if (!publicClient || !selectedToken || !ethAmount || parseFloat(ethAmount) <= 0) {
      setQuoteAmount(null);
      return;
    }

    setIsLoadingQuote(true);
    setError(null);

    try {
      const baseSlot = keccak256(concat([selectedToken.poolId, pad(toHex(POOLS_SLOT), { size: 32 })]));
      
      const slot0Data = await publicClient.readContract({
        address: CONTRACTS.POOL_MANAGER,
        abi: EXTSLOAD_ABI,
        functionName: 'extsload',
        args: [baseSlot as `0x${string}`],
      });

      if (slot0Data === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        setError('Pool not initialized');
        setQuoteAmount(null);
        setIsLoadingQuote(false);
        return;
      }

      const slot0BigInt = hexToBigInt(slot0Data as `0x${string}`);
      const sqrtPriceX96 = slot0BigInt & ((1n << 160n) - 1n);
      
      if (sqrtPriceX96 === 0n) {
        setError('Invalid pool state');
        setQuoteAmount(null);
        setIsLoadingQuote(false);
        return;
      }
      
      const inputAmountWei = parseEther(ethAmount);
      const sqrtPriceSq = sqrtPriceX96 * sqrtPriceX96;
      const q96Sq = Q96 * Q96;
      
      let amountOut: bigint;
      
      if (swapDirection === 'buy') {
        // ETH -> Token (zeroForOne = false, WETH is currency1)
        amountOut = (inputAmountWei * q96Sq) / sqrtPriceSq;
      } else {
        // Token -> ETH
        amountOut = (inputAmountWei * sqrtPriceSq) / q96Sq;
      }

      // Apply 2% slippage buffer for display
      const amountAfterFee = (amountOut * 98n) / 100n;
      setQuoteAmount(formatEther(amountAfterFee));
    } catch (e) {
      console.error('Error calculating quote:', e);
      setError('Failed to get quote');
      setQuoteAmount(null);
    }
    
    setIsLoadingQuote(false);
  }, [publicClient, selectedToken, ethAmount, swapDirection]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateQuote();
    }, 500);
    return () => clearTimeout(timer);
  }, [calculateQuote]);

  // Build single-transaction swap calldata
  // Commands: WRAP_ETH (0x0b) + V4_SWAP (0x10)
  // This wraps ETH to WETH inside the router, then swaps in one atomic tx
  const handleSwap = async () => {
    if (!address || !selectedToken || !quoteAmount) return;
    
    setError(null);
    
    try {
      const amountIn = parseEther(ethAmount);
      const minAmountOut = parseEther(quoteAmount) * 90n / 100n; // 10% slippage
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
      
      // === WRAP_ETH input ===
      // recipient: ADDRESS_THIS (0x02) keeps WETH in router for next command
      // amountMin: the ETH amount we're wrapping
      const wrapEthInput = encodeAbiParameters(
        [
          { type: 'address' }, // recipient
          { type: 'uint256' }, // amountMin
        ],
        [ADDRESS_THIS, amountIn]
      );
      
      // === V4_SWAP input ===
      const poolKey = DICKSTR_POOL;
      const zeroForOne = false; // WETH (currency1) -> Token (currency0)
      
      // For zeroForOne=false (buying token0 with token1), price goes UP
      // So we use MAX_SQRT_PRICE as the limit (allow price to go up to max)
      const sqrtPriceLimitX96 = MAX_SQRT_PRICE;
      
      const hookData = '0x' as `0x${string}`;
      
      // Actions: SWAP_EXACT_IN_SINGLE (0x06), SETTLE_ALL (0x0c), TAKE_ALL (0x0f)
      const actions = '0x060c0f' as `0x${string}`;
      
      // Swap params
      const swapParams = encodeAbiParameters(
        [
          { type: 'tuple', components: [
            { name: 'currency0', type: 'address' },
            { name: 'currency1', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'tickSpacing', type: 'int24' },
            { name: 'hooks', type: 'address' },
          ]},
          { type: 'bool' },    // zeroForOne
          { type: 'int128' },  // amountSpecified (positive = exact input)
          { type: 'uint128' }, // amountOutMinimum
          { type: 'uint160' }, // sqrtPriceLimitX96
          { type: 'bytes' },   // hookData
        ],
        [poolKey, zeroForOne, amountIn, minAmountOut, sqrtPriceLimitX96, hookData]
      );
      
      // SETTLE_ALL: settle WETH (currency1) - pulls from router balance (from WRAP_ETH)
      const settleParams = encodeAbiParameters(
        [
          { type: 'address' }, // currency
          { type: 'uint128' }, // maxAmount
        ],
        [poolKey.currency1, maxUint128]
      );
      
      // TAKE_ALL: take Token (currency0) to msg.sender
      const takeParams = encodeAbiParameters(
        [
          { type: 'address' }, // currency
          { type: 'uint128' }, // minAmount
        ],
        [poolKey.currency0, minAmountOut]
      );
      
      // Encode V4_SWAP input
      const v4SwapInput = encodeAbiParameters(
        [
          { type: 'bytes' },   // actions
          { type: 'bytes[]' }, // params
        ],
        [actions, [swapParams, settleParams, takeParams]]
      );
      
      // Commands: WRAP_ETH (0x0b) + V4_SWAP (0x10)
      const commands = '0x0b10' as `0x${string}`;
      const inputs = [wrapEthInput, v4SwapInput];
      
      console.log('Executing swap:', {
        commands,
        inputs,
        deadline: deadline.toString(),
        value: amountIn.toString(),
        sqrtPriceLimitX96: sqrtPriceLimitX96.toString(),
      });
      
      writeContract({
        address: UNIVERSAL_ROUTER,
        abi: UNIVERSAL_ROUTER_ABI,
        functionName: 'execute',
        args: [commands, inputs, deadline],
        value: amountIn, // Send native ETH
      });
      
    } catch (e: any) {
      console.error('Swap error:', e);
      setError(e.message || 'Swap failed');
    }
  };
  
  useEffect(() => {
    if (isSuccess) {
      resetWrite();
      setEthAmount('0.001');
    }
  }, [isSuccess, resetWrite]);

  const formatDisplayAmount = (amount: string | null) => {
    if (!amount) return null;
    const num = parseFloat(amount);
    if (isNaN(num)) return null;
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  const isSwapDisabled = isPending || isConfirming || !quoteAmount || isLoadingQuote || swapDirection === 'sell';

  return (
    <div className="container-editorial section-spacing">
      {/* Header */}
      <div className="mb-12">
        <div className="caption text-neutral-500 mb-4">UNISWAP V4</div>
        <h1 className="font-editorial headline-lg">SWAP TOKENS</h1>
      </div>
      
      <div className="max-w-lg">
        <div className="border-2 border-white">
          {!isConnected ? (
            <div className="p-12 text-center">
              <div className="font-editorial text-xl mb-6">WALLET REQUIRED</div>
              <p className="text-neutral-500 mb-8">Connect your wallet to start trading</p>
              <button
                onClick={() => connect({ connector: injected() })}
                className="btn-primary w-full"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <>
              {/* Wallet Info */}
              <div className="border-b-2 border-white p-4 flex justify-between items-center">
                <span className="font-mono text-sm text-neutral-400">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button 
                  onClick={() => disconnect()} 
                  className="text-neutral-500 hover:text-white text-xs uppercase tracking-wider"
                >
                  Disconnect
                </button>
              </div>

              {/* Direction Toggle */}
              <div className="grid grid-cols-2 border-b-2 border-white">
                <button
                  onClick={() => setSwapDirection('buy')}
                  className={`py-4 font-editorial text-sm uppercase tracking-widest transition-colors ${
                    swapDirection === 'buy' 
                      ? 'bg-white text-black' 
                      : 'bg-black text-neutral-400 hover:text-white'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setSwapDirection('sell')}
                  className={`py-4 font-editorial text-sm uppercase tracking-widest border-l-2 border-white transition-colors ${
                    swapDirection === 'sell' 
                      ? 'bg-white text-black' 
                      : 'bg-black text-neutral-400 hover:text-white'
                  }`}
                >
                  Sell
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Token Selector */}
                <div>
                  <label className="caption text-neutral-500 block mb-3">SELECT TOKEN</label>
                  <select
                    value={selectedToken?.address || ''}
                    onChange={(e) => {
                      const token = tokens.find(t => t.address === e.target.value);
                      setSelectedToken(token || null);
                    }}
                    className="input-brutal font-mono"
                    disabled={isLoadingTokens}
                  >
                    {isLoadingTokens ? (
                      <option>Loading...</option>
                    ) : (
                      tokens.map((token) => (
                        <option key={token.address} value={token.address}>
                          {token.symbol} — {token.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                
                {/* Input */}
                <div>
                  <label className="caption text-neutral-500 block mb-3">
                    {swapDirection === 'buy' ? 'YOU PAY' : 'YOU SELL'}
                  </label>
                  <div className="flex gap-0">
                    <input
                      type="number"
                      value={ethAmount}
                      onChange={(e) => setEthAmount(e.target.value)}
                      className="input-brutal flex-1 text-xl font-mono border-r-0"
                      step="0.001"
                      min="0"
                    />
                    <div className="border-2 border-white px-6 flex items-center font-editorial font-bold">
                      {swapDirection === 'buy' ? 'ETH' : selectedToken?.symbol || 'TOKEN'}
                    </div>
                  </div>
                </div>
                
                {/* Arrow */}
                <div className="text-center py-2">
                  <span className="font-editorial text-2xl text-neutral-600">↓</span>
                </div>
                
                {/* Output */}
                <div>
                  <label className="caption text-neutral-500 block mb-3">YOU RECEIVE</label>
                  <div className="flex gap-0">
                    <div className="input-brutal flex-1 text-neutral-400 border-r-0 flex items-center">
                      {isLoadingQuote ? (
                        <span className="animate-pulse-slow">Calculating...</span>
                      ) : quoteAmount ? (
                        <span className="text-white font-mono text-xl">~{formatDisplayAmount(quoteAmount)}</span>
                      ) : (
                        <span>Enter amount</span>
                      )}
                    </div>
                    <div className="border-2 border-white px-6 flex items-center font-editorial font-bold">
                      {swapDirection === 'buy' ? selectedToken?.symbol || 'TOKEN' : 'ETH'}
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="border-2 border-neutral-600 p-4 text-neutral-400 text-sm font-mono">
                    {error}
                  </div>
                )}
                
                {/* Sell not available notice */}
                {swapDirection === 'sell' && (
                  <div className="border-2 border-neutral-700 p-4 text-neutral-500 text-sm text-center">
                    Sell functionality coming soon
                  </div>
                )}
                
                {/* SWAP Button - single action */}
                <button
                  onClick={handleSwap}
                  disabled={isSwapDisabled}
                  className="btn-primary w-full"
                >
                  {isPending || isConfirming ? 'SWAPPING...' : 'SWAP'}
                </button>
                
                {/* Transaction Link */}
                {txHash && (
                  <div className="text-center">
                    <a 
                      href={`https://basescan.org/tx/${txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-neutral-500 hover:text-white text-sm font-mono underline"
                    >
                      View on BaseScan →
                    </a>
                  </div>
                )}

                {/* Success Message */}
                {isSuccess && (
                  <div className="border-2 border-white p-4 text-center font-editorial">
                    ✓ SWAP COMPLETE
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Pool Info */}
        {selectedToken && (
          <div className="mt-6 border border-neutral-800 p-4 text-xs text-neutral-600 font-mono space-y-1">
            <div>TOKEN: {selectedToken.address}</div>
            <div>POOL: {selectedToken.poolId.slice(0, 20)}...</div>
            <div>FEE: 1% (TO NFT HOLDERS)</div>
          </div>
        )}
      </div>
    </div>
  );
}
