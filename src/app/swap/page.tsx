// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useBalance, useSwitchChain, useChainId } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseEther, formatEther, formatUnits, keccak256, concat, pad, toHex, hexToBigInt, parseAbi, encodeAbiParameters, maxUint256, numberToHex } from 'viem';
import { CONTRACTS, getContracts, getChainFromId, CHAIN_IDS, BLOCK_EXPLORERS, hasDeployedContracts, type SupportedChain } from '@/config/contracts';
import { base, mainnet } from '@/config/wagmi';

// ABIs
const ERC20_ABI = [
  { name: 'symbol', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
  { name: 'name', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'decimals', type: 'function', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
  { name: 'allowance', type: 'function', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
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
    ],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

// Permit2 ABI
const PERMIT2_ABI = [
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [
      { name: 'amount', type: 'uint160' },
      { name: 'expiration', type: 'uint48' },
      { name: 'nonce', type: 'uint48' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint160' },
      { name: 'expiration', type: 'uint48' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// Token info interface
interface TokenInfo {
  address: `0x${string}`;
  symbol: string;
  name: string;
  poolId: `0x${string}`;
  chain?: string;
}

// Constants
const POOLS_SLOT = 6n;
const Q96 = BigInt(2 ** 96);

// Universal Router command codes
const WRAP_ETH = 0x0b;
const UNWRAP_ETH = 0x0c;
const V4_SWAP = 0x10;

// V4 action codes (from Uniswap v4-periphery Actions.sol)
const SWAP_EXACT_IN_SINGLE = 0x06;
const SETTLE = 0x0b;
const SETTLE_ALL = 0x0c;
const SETTLE_PAIR = 0x0d;
const TAKE = 0x0e;
const TAKE_ALL = 0x0f;
const TAKE_PAIR = 0x11;

// ADDRESS_THIS constant for Universal Router
const ADDRESS_THIS = '0x0000000000000000000000000000000000000002' as `0x${string}`;

// Helper to encode ExactInputSingleParams in ABI calldata format
function encodeExactInputSingleParams(
  poolKey: { currency0: `0x${string}`; currency1: `0x${string}`; fee: number; tickSpacing: number; hooks: `0x${string}` },
  zeroForOne: boolean,
  amountIn: bigint,
  amountOutMinimum: bigint,
  hookData: `0x${string}`
): `0x${string}` {
  const hookDataBytes = hookData === '0x' ? '0x' : hookData;
  const hookDataLength = hookDataBytes === '0x' ? 0 : (hookDataBytes.length - 2) / 2;
  const hookDataOffset = 0x120;
  
  return concat([
    pad(toHex(0x20), { size: 32 }),
    pad(poolKey.currency0, { size: 32 }),
    pad(poolKey.currency1, { size: 32 }),
    pad(toHex(poolKey.fee), { size: 32 }),
    pad(toHex(poolKey.tickSpacing), { size: 32 }),
    pad(poolKey.hooks, { size: 32 }),
    pad(toHex(zeroForOne ? 1 : 0), { size: 32 }),
    pad(toHex(amountIn), { size: 32 }),
    pad(toHex(amountOutMinimum), { size: 32 }),
    pad(toHex(hookDataOffset), { size: 32 }),
    pad(toHex(hookDataLength), { size: 32 }),
    ...(hookDataLength > 0 ? [pad(hookDataBytes as `0x${string}`, { size: Math.ceil(hookDataLength / 32) * 32 })] : []),
  ]) as `0x${string}`;
}

// Chain switcher component
function ChainSwitcher({ currentChain, onSwitch }: { currentChain: SupportedChain | null; onSwitch: (chain: SupportedChain) => void }) {
  return (
    <div className="flex gap-0 mb-6">
      <button
        onClick={() => onSwitch('base')}
        className={`flex-1 py-3 px-4 border-2 border-r-0 font-mono text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
          currentChain === 'base'
            ? 'bg-white text-black border-white'
            : 'bg-transparent text-neutral-400 border-neutral-600 hover:border-neutral-400'
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 111 111" fill="currentColor">
          <path d="M54.921 110.034c30.354 0 54.967-24.593 54.967-54.921S85.275.191 54.921.191C26.043.191 2.003 22.567.142 51.031h71.858v7.983H.141c1.858 28.464 25.9 51.02 54.78 51.02Z"/>
        </svg>
        BASE
      </button>
      <button
        onClick={() => onSwitch('ethereum')}
        className={`flex-1 py-3 px-4 border-2 font-mono text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
          currentChain === 'ethereum'
            ? 'bg-white text-black border-white'
            : 'bg-transparent text-neutral-400 border-neutral-600 hover:border-neutral-400'
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 784 784" fill="currentColor">
          <path d="M392.07 0L383.5 29.11v517.91l8.57 8.56 392.07-231.75z"/>
          <path d="M392.07 0L0 323.83l392.07 231.75V0z"/>
          <path d="M392.07 603.78L387.24 609.68v300.34l4.83 14.08 392.4-552.27z"/>
          <path d="M392.07 924.1V603.78L0 371.83z"/>
        </svg>
        ETH
      </button>
    </div>
  );
}

export default function SwapPage() {
  const chainId = useChainId();
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  
  // Determine current chain
  const currentChain = getChainFromId(chainId);
  const chainContracts = currentChain ? getContracts(currentChain) : getContracts('base');
  const blockExplorer = currentChain ? BLOCK_EXPLORERS[currentChain] : BLOCK_EXPLORERS.base;
  
  // Balances
  const { data: ethBalanceData } = useBalance({ address });
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [inputAmount, setInputAmount] = useState('0.001');
  const [quoteAmount, setQuoteAmount] = useState<string | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [swapDirection, setSwapDirection] = useState<'buy' | 'sell'>('buy');
  const [error, setError] = useState<string | null>(null);
  
  // Approval state for sell
  const [needsTokenApproval, setNeedsTokenApproval] = useState(false);
  const [needsPermit2Approval, setNeedsPermit2Approval] = useState(false);
  const [approvalStep, setApprovalStep] = useState<'none' | 'token' | 'permit2'>('none');
  
  const { writeContract, data: txHash, isPending, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Handle chain switch
  const handleChainSwitch = (chain: SupportedChain) => {
    const targetChainId = chain === 'base' ? base.id : mainnet.id;
    if (chainId !== targetChainId) {
      switchChain({ chainId: targetChainId });
    }
  };

  // Load tokens from API (filtered by current chain) - FULLY DYNAMIC
  useEffect(() => {
    const loadTokens = async () => {
      setIsLoadingTokens(true);
      setError(null);
      
      try {
        // Fetch with chain filter
        const response = await fetch(`/api/tokens?chain=${currentChain || 'base'}`);
        const data = await response.json();
        
        if (data.error) {
          console.error('API error:', data.error);
          setError(`Failed to load tokens: ${data.error}`);
          setTokens([]);
          setSelectedToken(null);
          setIsLoadingTokens(false);
          return;
        }
        
        if (data.tokens && Array.isArray(data.tokens) && data.tokens.length > 0) {
          const chainTokens = data.tokens
            .filter((t: any) => t && t.address && t.pool_id) // Must have address AND pool_id
            .map((t: any) => ({
              address: t.address as `0x${string}`,
              symbol: t.symbol || 'UNKNOWN',
              name: t.name || 'Unknown Token',
              poolId: (typeof t.pool_id === 'string' ? t.pool_id : `0x${Buffer.from(t.pool_id).toString('hex')}`) as `0x${string}`,
              chain: t.chain || 'base',
            }));
          
          if (chainTokens.length > 0) {
            setTokens(chainTokens);
            setSelectedToken(chainTokens[0]);
          } else {
            setTokens([]);
            setSelectedToken(null);
            setError(`No tokens with valid pool_id on ${currentChain || 'base'}`);
          }
        } else {
          setTokens([]);
          setSelectedToken(null);
          // Not an error - just no tokens deployed yet
        }
      } catch (e: any) {
        console.error('Error loading tokens:', e);
        setError(`Network error: ${e.message}`);
        setTokens([]);
        setSelectedToken(null);
      }
      setIsLoadingTokens(false);
    };

    loadTokens();
  }, [currentChain]);

  // Load token balance
  useEffect(() => {
    const loadTokenBalance = async () => {
      if (!publicClient || !address || !selectedToken) {
        setTokenBalance(0n);
        return;
      }
      
      try {
        const balance = await publicClient.readContract({
          address: selectedToken.address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        });
        setTokenBalance(balance as bigint);
      } catch (e) {
        console.error('Error loading token balance:', e);
        setTokenBalance(0n);
      }
    };

    loadTokenBalance();
  }, [publicClient, address, selectedToken, isSuccess]);

  // Check approval for sell
  useEffect(() => {
    const checkApproval = async () => {
      // Early return with safe defaults if any required value is missing
      if (swapDirection !== 'sell') {
        setNeedsTokenApproval(false);
        setNeedsPermit2Approval(false);
        return;
      }
      
      if (!publicClient || !address || !selectedToken?.address || !inputAmount || !chainContracts?.PERMIT2 || !chainContracts?.UNIVERSAL_ROUTER) {
        setNeedsTokenApproval(false);
        setNeedsPermit2Approval(false);
        return;
      }
      
      // Validate addresses before using them
      if (!selectedToken.address || selectedToken.address.length !== 42) {
        console.warn('Invalid token address');
        setNeedsTokenApproval(false);
        setNeedsPermit2Approval(false);
        return;
      }
      
      try {
        const amountIn = parseEther(inputAmount || '0');
        if (amountIn <= 0n) {
          setNeedsTokenApproval(false);
          setNeedsPermit2Approval(false);
          return;
        }
        
        const allowance = await publicClient.readContract({
          address: selectedToken.address,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, chainContracts.PERMIT2],
        });
        
        const needsToken = (allowance as bigint) < amountIn;
        setNeedsTokenApproval(needsToken);
        
        const permit2Allowance = await publicClient.readContract({
          address: chainContracts.PERMIT2,
          abi: PERMIT2_ABI,
          functionName: 'allowance',
          args: [address, selectedToken.address, chainContracts.UNIVERSAL_ROUTER],
        });
        
        if (!permit2Allowance || !Array.isArray(permit2Allowance)) {
          setNeedsPermit2Approval(true);
          return;
        }
        
        const [amount, expiration] = permit2Allowance as [bigint, number, number];
        const now = Math.floor(Date.now() / 1000);
        
        const needsPermit2 = amount < amountIn || expiration < now;
        setNeedsPermit2Approval(needsPermit2);
      } catch (e) {
        console.error('Error checking approval:', e);
        // On error, assume no approval needed to avoid blocking UI
        setNeedsTokenApproval(false);
        setNeedsPermit2Approval(false);
      }
    };

    checkApproval();
  }, [publicClient, address, selectedToken, inputAmount, swapDirection, isSuccess, chainContracts]);

  // Calculate quote from sqrtPriceX96
  const calculateQuote = useCallback(async () => {
    // Validate all required values before proceeding
    if (!publicClient || !chainContracts?.POOL_MANAGER) {
      setQuoteAmount(null);
      return;
    }
    
    if (!selectedToken?.poolId || !selectedToken?.address) {
      setQuoteAmount(null);
      return;
    }
    
    if (!inputAmount || parseFloat(inputAmount) <= 0 || isNaN(parseFloat(inputAmount))) {
      setQuoteAmount(null);
      return;
    }

    setIsLoadingQuote(true);
    setError(null);

    try {
      // Ensure poolId is valid hex
      if (!selectedToken.poolId || selectedToken.poolId.length < 10) {
        setError('Invalid pool ID');
        setQuoteAmount(null);
        setIsLoadingQuote(false);
        return;
      }
      
      const baseSlot = keccak256(concat([selectedToken.poolId, pad(toHex(POOLS_SLOT), { size: 32 })]));
      
      const slot0Data = await publicClient.readContract({
        address: chainContracts.POOL_MANAGER,
        abi: EXTSLOAD_ABI,
        functionName: 'extsload',
        args: [baseSlot as `0x${string}`],
      });

      if (!slot0Data || slot0Data === '0x0000000000000000000000000000000000000000000000000000000000000000') {
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
      
      const inputAmountWei = parseEther(inputAmount);
      const sqrtPriceSq = sqrtPriceX96 * sqrtPriceX96;
      const q96Sq = Q96 * Q96;
      
      let amountOut: bigint;
      
      if (swapDirection === 'buy') {
        amountOut = (inputAmountWei * q96Sq) / sqrtPriceSq;
      } else {
        amountOut = (inputAmountWei * sqrtPriceSq) / q96Sq;
      }

      const amountAfterFee = (amountOut * 98n) / 100n;
      setQuoteAmount(formatEther(amountAfterFee));
    } catch (e: any) {
      console.error('Error calculating quote:', e);
      setError(e?.message || 'Failed to get quote');
      setQuoteAmount(null);
    }
    
    setIsLoadingQuote(false);
  }, [publicClient, selectedToken, inputAmount, swapDirection, chainContracts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateQuote();
    }, 500);
    return () => clearTimeout(timer);
  }, [calculateQuote]);

  // Handle MAX button
  const handleMax = () => {
    if (swapDirection === 'buy') {
      if (ethBalanceData) {
        const maxEth = ethBalanceData.value - parseEther('0.001');
        if (maxEth > 0n) {
          setInputAmount(formatEther(maxEth));
        }
      }
    } else {
      if (tokenBalance > 0n) {
        setInputAmount(formatEther(tokenBalance));
      }
    }
  };

  // Handle approval - Step 1: Token to Permit2
  const handleTokenApprove = async () => {
    if (!selectedToken || !address || !chainContracts.PERMIT2) return;
    
    setApprovalStep('token');
    setError(null);
    
    try {
      writeContract({
        address: selectedToken.address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [chainContracts.PERMIT2, maxUint256],
      });
    } catch (e: any) {
      console.error('Token approval error:', e);
      setError(e.message || 'Token approval failed');
      setApprovalStep('none');
    }
  };

  // Handle approval - Step 2: Permit2 to Router
  const handlePermit2Approve = async () => {
    if (!selectedToken || !address || !chainContracts.PERMIT2 || !chainContracts.UNIVERSAL_ROUTER) return;
    
    setApprovalStep('permit2');
    setError(null);
    
    try {
      writeContract({
        address: chainContracts.PERMIT2,
        abi: PERMIT2_ABI,
        functionName: 'approve',
        args: [
          selectedToken.address,
          chainContracts.UNIVERSAL_ROUTER,
          BigInt('0xffffffffffffffffffffffffffffffff'),
          Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
        ],
      });
    } catch (e: any) {
      console.error('Permit2 approval error:', e);
      setError(e.message || 'Permit2 approval failed');
      setApprovalStep('none');
    }
  };

  // Reset approval step when tx succeeds
  useEffect(() => {
    if (isSuccess && approvalStep !== 'none') {
      setApprovalStep('none');
    }
  }, [isSuccess, approvalStep]);

  // Build and execute swap
  const handleSwap = async () => {
    if (!address || !selectedToken || !quoteAmount || !chainContracts.HOOK || !chainContracts.WETH || !chainContracts.UNIVERSAL_ROUTER) return;
    
    setError(null);
    
    try {
      const amountIn = parseEther(inputAmount);
      const minAmountOut = parseEther(quoteAmount) * 90n / 100n;
      
      const poolKey = {
        currency0: selectedToken.address.toLowerCase() < chainContracts.WETH.toLowerCase() 
          ? selectedToken.address.toLowerCase() as `0x${string}`
          : chainContracts.WETH.toLowerCase() as `0x${string}`,
        currency1: selectedToken.address.toLowerCase() < chainContracts.WETH.toLowerCase()
          ? chainContracts.WETH.toLowerCase() as `0x${string}`
          : selectedToken.address.toLowerCase() as `0x${string}`,
        fee: 0x800000,
        tickSpacing: 200,
        hooks: chainContracts.HOOK.toLowerCase() as `0x${string}`,
      };
      const hookData = '0x' as `0x${string}`;
      
      if (swapDirection === 'buy') {
        const wrapEthInput = encodeAbiParameters(
          [{ type: 'address' }, { type: 'uint256' }],
          [ADDRESS_THIS, amountIn]
        );
        
        const actions = '0x060b0f' as `0x${string}`;
        const zeroForOne = false;
        
        const swapParams = encodeExactInputSingleParams(
          poolKey,
          zeroForOne,
          amountIn,
          minAmountOut,
          hookData
        );
        
        const settlePairParams = encodeAbiParameters(
          [{ type: 'address' }, { type: 'uint256' }, { type: 'bool' }],
          [poolKey.currency1, amountIn, false]
        );
        
        const takePairParams = encodeAbiParameters(
          [{ type: 'address' }, { type: 'uint256' }],
          [poolKey.currency0, 0n]
        );
        
        const v4SwapInput = encodeAbiParameters(
          [{ type: 'bytes' }, { type: 'bytes[]' }],
          [actions, [swapParams, settlePairParams, takePairParams]]
        );
        
        const commands = '0x0b10' as `0x${string}`;
        const inputs = [wrapEthInput, v4SwapInput];
        
        writeContract({
          address: chainContracts.UNIVERSAL_ROUTER,
          abi: UNIVERSAL_ROUTER_ABI,
          functionName: 'execute',
          args: [commands, inputs],
          value: amountIn,
        });
        
      } else {
        const actions = '0x060b0e' as `0x${string}`;
        const zeroForOne = true;
        
        const swapParams = encodeExactInputSingleParams(
          poolKey,
          zeroForOne,
          amountIn,
          minAmountOut,
          hookData
        );
        
        const settleParams = encodeAbiParameters(
          [{ type: 'address' }, { type: 'uint256' }, { type: 'bool' }],
          [poolKey.currency0, 0n, true]
        );
        
        const takeParams = encodeAbiParameters(
          [{ type: 'address' }, { type: 'address' }, { type: 'uint256' }],
          [poolKey.currency1, ADDRESS_THIS, 0n]
        );
        
        const v4SwapInput = encodeAbiParameters(
          [{ type: 'bytes' }, { type: 'bytes[]' }],
          [actions, [swapParams, settleParams, takeParams]]
        );
        
        const unwrapEthInput = encodeAbiParameters(
          [{ type: 'address' }, { type: 'uint256' }],
          [address, minAmountOut]
        );
        
        const commands = '0x100c' as `0x${string}`;
        const inputs = [v4SwapInput, unwrapEthInput];
        
        writeContract({
          address: chainContracts.UNIVERSAL_ROUTER,
          abi: UNIVERSAL_ROUTER_ABI,
          functionName: 'execute',
          args: [commands, inputs],
          value: 0n,
        });
      }
      
    } catch (e: any) {
      console.error('Swap error:', e);
      setError(e.message || 'Swap failed');
    }
  };
  
  useEffect(() => {
    if (isSuccess && approvalStep === 'none') {
      resetWrite();
      setInputAmount('0.001');
    }
  }, [isSuccess, approvalStep, resetWrite]);

  const formatDisplayAmount = (amount: string | null) => {
    if (!amount) return null;
    const num = parseFloat(amount);
    if (isNaN(num)) return null;
    if (num < 0.01) return num.toFixed(6);
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 4 
    });
  };

  const formatBalance = (balance: bigint) => {
    const num = parseFloat(formatEther(balance));
    if (num < 0.0001) return '< 0.0001';
    if (num < 1) return num.toFixed(4);
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const needsAnyApproval = swapDirection === 'sell' && (needsTokenApproval || needsPermit2Approval);
  const isSwapDisabled = isPending || isConfirming || !quoteAmount || isLoadingQuote || needsAnyApproval || !hasDeployedContracts(currentChain || 'base');

  return (
    <div className="container-editorial section-spacing">
      {/* Header */}
      <div className="mb-6 md:mb-12">
        <div className="caption text-neutral-500 mb-4">UNISWAP V4</div>
        <h1 className="font-editorial text-3xl md:headline-lg">TRADE</h1>
      </div>
      
      <div className="grid lg:grid-cols-5 gap-8 max-w-6xl">
        {/* GeckoTerminal Chart */}
        <div className="border-2 border-white hidden lg:block lg:col-span-3">
          <div className="border-b-2 border-white p-4">
            <span className="font-editorial text-sm uppercase tracking-widest">PRICE CHART</span>
          </div>
          {selectedToken ? (
            <iframe
              src={`https://www.geckoterminal.com/${currentChain === 'ethereum' ? 'eth' : 'base'}/pools/${selectedToken.address}?embed=1&info=0&swaps=1&grayscale=1`}
              width="100%"
              height="600"
              frameBorder="0"
              className="bg-black"
              title="Price Chart"
            />
          ) : (
            <div className="h-[600px] flex items-center justify-center text-neutral-600 text-sm">
              Select a token to view chart
            </div>
          )}
        </div>

        {/* Swap Interface */}
        <div className="border-2 border-white lg:col-span-2">
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

              <div className="p-6 space-y-6">
                {/* Chain Switcher */}
                <ChainSwitcher currentChain={currentChain} onSwitch={handleChainSwitch} />

                {/* Show warning if Ethereum contracts not deployed */}
                {currentChain === 'ethereum' && !hasDeployedContracts('ethereum') && (
                  <div className="border-2 border-yellow-500/50 bg-yellow-500/10 p-4 text-sm text-yellow-400">
                    ⚠️ Ethereum contracts not deployed yet. Trading coming soon!
                  </div>
                )}

                {/* Direction Toggle */}
                <div className="grid grid-cols-2 border-2 border-white">
                  <button
                    onClick={() => { setSwapDirection('buy'); setInputAmount('0.001'); }}
                    className={`py-4 font-editorial text-sm uppercase tracking-widest transition-colors ${
                      swapDirection === 'buy' 
                        ? 'bg-white text-black' 
                        : 'bg-black text-neutral-400 hover:text-white'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => { setSwapDirection('sell'); setInputAmount('1'); }}
                    className={`py-4 font-editorial text-sm uppercase tracking-widest border-l-2 border-white transition-colors ${
                      swapDirection === 'sell' 
                        ? 'bg-white text-black' 
                        : 'bg-black text-neutral-400 hover:text-white'
                    }`}
                  >
                    Sell
                  </button>
                </div>

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
                    disabled={isLoadingTokens || tokens.length === 0}
                  >
                    {isLoadingTokens ? (
                      <option>Loading...</option>
                    ) : tokens.length === 0 ? (
                      <option>No tokens on this chain</option>
                    ) : (
                      tokens.map((token) => (
                        <option key={token.address} value={token.address}>
                          {token.symbol} — {token.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Balances */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="border border-neutral-700 p-3">
                    <div className="text-neutral-500 text-xs mb-1">{currentChain === 'ethereum' ? 'ETH' : 'ETH'} Balance</div>
                    <div className="font-mono">
                      {ethBalanceData ? formatBalance(ethBalanceData.value) : '0'} ETH
                    </div>
                  </div>
                  <div className="border border-neutral-700 p-3">
                    <div className="text-neutral-500 text-xs mb-1">{selectedToken?.symbol || 'Token'} Balance</div>
                    <div className="font-mono">
                      {formatBalance(tokenBalance)} {selectedToken?.symbol || ''}
                    </div>
                  </div>
                </div>
                
                {/* Input */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="caption text-neutral-500">
                      {swapDirection === 'buy' ? 'YOU PAY' : 'YOU SELL'}
                    </label>
                    <button
                      onClick={handleMax}
                      className="text-xs text-neutral-400 hover:text-white border border-neutral-600 px-2 py-1 uppercase tracking-wider"
                    >
                      MAX
                    </button>
                  </div>
                  <div className="flex gap-0">
                    <input
                      type="number"
                      value={inputAmount}
                      onChange={(e) => setInputAmount(e.target.value)}
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
                
                {/* Approval Buttons (for sell) */}
                {swapDirection === 'sell' && needsTokenApproval && (
                  <button
                    onClick={handleTokenApprove}
                    disabled={isPending || isConfirming}
                    className="btn-primary w-full"
                  >
                    {isPending || isConfirming ? 'APPROVING...' : `STEP 1: APPROVE ${selectedToken?.symbol || 'TOKEN'} TO PERMIT2`}
                  </button>
                )}
                
                {swapDirection === 'sell' && !needsTokenApproval && needsPermit2Approval && (
                  <button
                    onClick={handlePermit2Approve}
                    disabled={isPending || isConfirming}
                    className="btn-primary w-full"
                  >
                    {isPending || isConfirming ? 'APPROVING...' : `STEP 2: APPROVE PERMIT2 TO ROUTER`}
                  </button>
                )}
                
                {/* SWAP Button */}
                <button
                  onClick={handleSwap}
                  disabled={isSwapDisabled}
                  className="btn-primary w-full"
                >
                  {isPending || isConfirming ? 'SWAPPING...' : 
                   currentChain === 'ethereum' && !hasDeployedContracts('ethereum') ? 'COMING SOON' :
                   needsAnyApproval ? 'COMPLETE APPROVALS FIRST' : 'SWAP'}
                </button>
                
                {/* Transaction Link */}
                {txHash && (
                  <div className="text-center">
                    <a 
                      href={`${blockExplorer}/tx/${txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-neutral-500 hover:text-white text-sm font-mono underline"
                    >
                      View on {currentChain === 'ethereum' ? 'Etherscan' : 'BaseScan'} →
                    </a>
                  </div>
                )}

                {/* Success Message */}
                {isSuccess && approvalStep === 'none' && !needsAnyApproval && (
                  <div className="border-2 border-white p-4 text-center font-editorial">
                    ✓ SWAP COMPLETE
                  </div>
                )}
                
                {/* Approval Success Message */}
                {isSuccess && (needsTokenApproval || needsPermit2Approval) && (
                  <div className="border-2 border-neutral-600 p-4 text-center font-editorial text-neutral-400">
                    ✓ APPROVAL CONFIRMED — CONTINUE TO NEXT STEP
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
            <div>POOL: {selectedToken.poolId?.slice(0, 20)}...</div>
            <div>FEE: 1% (TO NFT HOLDERS)</div>
            <div>CHAIN: {currentChain?.toUpperCase() || 'BASE'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
