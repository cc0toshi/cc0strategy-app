// @ts-nocheck
'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseAbi, Address, isAddress, decodeEventLog } from 'viem';

// Factory contract on Base mainnet
const FACTORY_ADDRESS = '0x70b17db500Ce1746BB34f908140d0279C183f3eb' as const;

// Default config addresses
const DEFAULT_HOOK = '0x0000000000000000000000000000000000000000' as const;
const DEFAULT_LOCKER = '0x0000000000000000000000000000000000000000' as const;
const DEFAULT_MEV_MODULE = '0x0000000000000000000000000000000000000000' as const;
const WETH_BASE = '0x4200000000000000000000000000000000000006' as const;

const BASE_CHAIN_ID = 8453n;

// ABIs
const factoryAbi = parseAbi([
  'function deployToken((address tokenAdmin, string name, string symbol, bytes32 salt, string image, string metadata, string context, uint256 originatingChainId) tokenConfig, (address hook, address pairedToken, int24 tickIfToken0IsClanker, int24 tickSpacing, bytes poolData) poolConfig, (address locker, address[] rewardAdmins, address[] rewardRecipients, uint16[] rewardBps, int24[] tickLower, int24[] tickUpper, uint16[] positionBps, bytes lockerData) lockerConfig, (address mevModule, bytes mevModuleData) mevModuleConfig, (address extension, uint256 msgValue, uint16 extensionBps, bytes extensionData)[] extensionConfigs, address nftCollection) external payable returns (address)',
  'event TokenCreated(address msgSender, address indexed tokenAddress, address indexed tokenAdmin, string tokenImage, string tokenName, string tokenSymbol, string tokenMetadata, string tokenContext, int24 startingTick, address poolHook, bytes32 poolId, address pairedToken, address locker, address mevModule, uint256 extensionsSupply, address[] extensions)',
]);

const erc721EnumerableAbi = parseAbi([
  'function totalSupply() external view returns (uint256)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
]);

const ownableAbi = parseAbi([
  'function renounceOwnership() external',
  'function owner() external view returns (address)',
]);

type DeployStep = 'idle' | 'uploading' | 'validating' | 'deploying' | 'confirming' | 'renouncing' | 'done' | 'error';

export default function DeployPage() {
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    nftCollection: '',
    description: '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ipfsUrl, setIpfsUrl] = useState<string | null>(null);
  
  const [step, setStep] = useState<DeployStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [deployedToken, setDeployedToken] = useState<string | null>(null);
  const [nftInfo, setNftInfo] = useState<{ name: string; symbol: string; supply: bigint } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { writeContract, data: deployHash, isPending: isDeploying, error: deployError } = useWriteContract();
  const { writeContract: renounceWrite, data: renounceHash, isPending: isRenouncing, error: renounceError } = useWriteContract();
  
  const { isLoading: isWaitingDeploy, isSuccess: isDeploySuccess, data: deployReceipt } = useWaitForTransactionReceipt({
    hash: deployHash,
  });
  
  const { isLoading: isWaitingRenounce, isSuccess: isRenounceSuccess } = useWaitForTransactionReceipt({
    hash: renounceHash,
  });

  const { data: nftSupply, isError: isSupplyError, refetch: refetchSupply } = useReadContract({
    address: isAddress(formData.nftCollection) ? formData.nftCollection as Address : undefined,
    abi: erc721EnumerableAbi,
    functionName: 'totalSupply',
    query: {
      enabled: isAddress(formData.nftCollection),
    }
  });

  const { data: nftName } = useReadContract({
    address: isAddress(formData.nftCollection) ? formData.nftCollection as Address : undefined,
    abi: erc721EnumerableAbi,
    functionName: 'name',
    query: {
      enabled: isAddress(formData.nftCollection),
    }
  });

  const { data: nftSymbol } = useReadContract({
    address: isAddress(formData.nftCollection) ? formData.nftCollection as Address : undefined,
    abi: erc721EnumerableAbi,
    functionName: 'symbol',
    query: {
      enabled: isAddress(formData.nftCollection),
    }
  });

  useEffect(() => {
    if (isDeploySuccess && deployReceipt && step === 'confirming') {
      const tokenCreatedLog = deployReceipt.logs.find(log => {
        try {
          return log.topics.length >= 2;
        } catch {
          return false;
        }
      });

      if (tokenCreatedLog && tokenCreatedLog.topics[1]) {
        const tokenAddr = `0x${tokenCreatedLog.topics[1].slice(26)}` as Address;
        setDeployedToken(tokenAddr);
        
        setStep('renouncing');
        renounceWrite({
          address: tokenAddr,
          abi: ownableAbi,
          functionName: 'renounceOwnership',
        });
      } else {
        setError('Could not find deployed token address');
        setStep('error');
      }
    }
  }, [isDeploySuccess, deployReceipt, step, renounceWrite]);

  useEffect(() => {
    if (isRenounceSuccess && step === 'renouncing') {
      setStep('done');
    }
  }, [isRenounceSuccess, step]);

  useEffect(() => {
    if (deployError) {
      setError(deployError.message);
      setStep('error');
    }
    if (renounceError) {
      setError(`Token deployed but renounce failed: ${renounceError.message}`);
      setStep('done');
    }
  }, [deployError, renounceError]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setIpfsUrl(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToIPFS = async (): Promise<string> => {
    if (!imageFile) throw new Error('No image selected');
    
    const formData = new FormData();
    formData.append('file', imageFile);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to upload image');
    }
    
    const result = await response.json();
    return result.ipfsUrl;
  };

  const validateNFTCollection = async (): Promise<boolean> => {
    if (!isAddress(formData.nftCollection)) {
      throw new Error('Invalid NFT collection address');
    }
    
    await refetchSupply();
    
    if (isSupplyError || nftSupply === undefined) {
      throw new Error('NFT collection must implement ERC721Enumerable (totalSupply)');
    }
    
    if (nftSupply === 0n) {
      throw new Error('NFT collection has no tokens minted');
    }
    
    return true;
  };

  const handleDeploy = async () => {
    setError(null);
    
    if (!formData.name || !formData.symbol || !formData.nftCollection) {
      setError('Please fill all required fields');
      return;
    }
    
    if (!imageFile) {
      setError('Please upload a token image');
      return;
    }
    
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    
    try {
      setStep('uploading');
      const imageUrl = await uploadToIPFS();
      setIpfsUrl(imageUrl);
      
      setStep('validating');
      await validateNFTCollection();
      
      if (nftName && nftSymbol && nftSupply) {
        setNftInfo({ name: nftName, symbol: nftSymbol, supply: nftSupply });
      }
      
      setStep('deploying');
      
      const salt = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
      
      const tokenConfig = {
        tokenAdmin: address as Address,
        name: formData.name,
        symbol: formData.symbol,
        salt: salt,
        image: imageUrl,
        metadata: formData.description || '',
        context: 'cc0strategy',
        originatingChainId: BASE_CHAIN_ID,
      };
      
      const poolConfig = {
        hook: DEFAULT_HOOK as Address,
        pairedToken: WETH_BASE as Address,
        tickIfToken0IsClanker: 0 as number,
        tickSpacing: 60 as number,
        poolData: '0x' as `0x${string}`,
      };
      
      const lockerConfig = {
        locker: DEFAULT_LOCKER as Address,
        rewardAdmins: [] as Address[],
        rewardRecipients: [] as Address[],
        rewardBps: [] as number[],
        tickLower: [] as number[],
        tickUpper: [] as number[],
        positionBps: [] as number[],
        lockerData: '0x' as `0x${string}`,
      };
      
      const mevModuleConfig = {
        mevModule: DEFAULT_MEV_MODULE as Address,
        mevModuleData: '0x' as `0x${string}`,
      };
      
      writeContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'deployToken',
        args: [
          tokenConfig,
          poolConfig,
          lockerConfig,
          mevModuleConfig,
          [],
          formData.nftCollection as Address,
        ],
      });
      
      setStep('confirming');
      
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const getStepStatus = (targetStep: DeployStep) => {
    const stepOrder: DeployStep[] = ['idle', 'uploading', 'validating', 'deploying', 'confirming', 'renouncing', 'done'];
    const currentIndex = stepOrder.indexOf(step);
    const targetIndex = stepOrder.indexOf(targetStep);
    
    if (step === 'error') return 'error';
    if (currentIndex > targetIndex) return 'complete';
    if (currentIndex === targetIndex) return 'active';
    return 'pending';
  };

  const StepIndicator = ({ stepName, label, number }: { stepName: DeployStep; label: string; number: string }) => {
    const status = getStepStatus(stepName);
    return (
      <div className={`flex items-center gap-4 p-4 border-b-2 last:border-b-0 ${
        status === 'complete' ? 'border-white bg-white text-black' :
        status === 'active' ? 'border-white' :
        status === 'error' ? 'border-neutral-700 text-neutral-600' :
        'border-neutral-800 text-neutral-600'
      }`}>
        <div className={`w-8 h-8 flex items-center justify-center border-2 font-editorial text-sm ${
          status === 'complete' ? 'border-black bg-black text-white' :
          status === 'active' ? 'border-white animate-pulse' :
          'border-neutral-700'
        }`}>
          {status === 'complete' ? '✓' : number}
        </div>
        <span className="font-mono text-sm uppercase tracking-wider">{label}</span>
      </div>
    );
  };

  const resetForm = () => {
    setStep('idle');
    setFormData({ name: '', symbol: '', nftCollection: '', description: '' });
    setImageFile(null);
    setImagePreview(null);
    setIpfsUrl(null);
    setDeployedToken(null);
    setNftInfo(null);
    setError(null);
  };

  return (
    <div className="container-editorial section-spacing">
      {/* Header */}
      <div className="mb-12">
        <div className="caption text-neutral-500 mb-4">TOKEN FACTORY</div>
        <h1 className="font-editorial headline-lg">DEPLOY TOKEN</h1>
        <p className="text-neutral-400 mt-4 max-w-xl">
          Launch a new ERC-20 token linked to your NFT collection. 
          Trading fees will flow directly to NFT holders.
        </p>
      </div>
      
      <div className="max-w-xl">
        <div className="border-2 border-white">
          {!isConnected ? (
            <div className="p-12 text-center">
              <div className="font-editorial text-xl mb-6">WALLET REQUIRED</div>
              <p className="text-neutral-500 mb-8">Connect your wallet to deploy a token</p>
              <button 
                onClick={() => connect({ connector: injected() })} 
                className="btn-primary w-full"
              >
                Connect Wallet
              </button>
            </div>
          ) : step !== 'idle' ? (
            // Deployment Progress
            <div>
              <div className="border-b-2 border-white p-6">
                <h2 className="font-editorial text-xl">DEPLOYMENT PROGRESS</h2>
              </div>
              
              <div>
                <StepIndicator stepName="uploading" label="Upload to IPFS" number="1" />
                <StepIndicator stepName="validating" label="Validate NFT Collection" number="2" />
                <StepIndicator stepName="deploying" label="Deploy Contract" number="3" />
                <StepIndicator stepName="confirming" label="Confirm Transaction" number="4" />
                <StepIndicator stepName="renouncing" label="Renounce Ownership" number="5" />
                <StepIndicator stepName="done" label="Complete" number="✓" />
              </div>
              
              <div className="p-6 space-y-4">
                {ipfsUrl && (
                  <div className="border border-neutral-800 p-4">
                    <div className="caption text-neutral-500 mb-2">IPFS IMAGE</div>
                    <p className="text-xs font-mono break-all text-neutral-400">{ipfsUrl}</p>
                  </div>
                )}
                
                {nftInfo && (
                  <div className="border border-neutral-800 p-4">
                    <div className="caption text-neutral-500 mb-2">NFT COLLECTION</div>
                    <p className="text-sm">
                      {nftInfo.name} ({nftInfo.symbol}) — {nftInfo.supply.toString()} tokens
                    </p>
                  </div>
                )}
                
                {deployedToken && (
                  <div className="border border-neutral-800 p-4">
                    <div className="caption text-neutral-500 mb-2">TOKEN ADDRESS</div>
                    <p className="text-xs font-mono break-all">{deployedToken}</p>
                  </div>
                )}
                
                {error && step === 'error' && (
                  <div className="border-2 border-neutral-600 p-4 text-neutral-400 text-sm">
                    ERROR: {error}
                  </div>
                )}
                
                {(step === 'done' || step === 'error') && (
                  <div className="pt-4">
                    {step === 'done' && (
                      <div className="text-center mb-6">
                        <div className="font-editorial text-2xl mb-2">✓ SUCCESS</div>
                        <p className="text-neutral-400 text-sm">
                          Token deployed. Ownership renounced. Fully decentralized.
                        </p>
                      </div>
                    )}
                    <button
                      onClick={resetForm}
                      className="btn-secondary w-full"
                    >
                      {step === 'error' ? 'TRY AGAIN' : 'DEPLOY ANOTHER'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Form
            <>
              {/* Wallet Info */}
              <div className="border-b-2 border-white p-4 flex items-center justify-between">
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
                {error && (
                  <div className="border-2 border-neutral-600 p-4 text-neutral-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Image Upload */}
                <div>
                  <label className="caption text-neutral-500 block mb-3">TOKEN IMAGE *</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-600 p-8 text-center cursor-pointer hover:border-white transition-colors"
                  >
                    {imagePreview ? (
                      <div className="flex flex-col items-center">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-24 h-24 object-cover mb-4 grayscale"
                        />
                        <p className="text-xs text-neutral-400 font-mono">{imageFile?.name}</p>
                      </div>
                    ) : (
                      <div>
                        <div className="font-editorial text-lg mb-2">CLICK TO UPLOAD</div>
                        <p className="text-xs text-neutral-600">PNG, JPG, GIF, WebP</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                <div>
                  <label className="caption text-neutral-500 block mb-3">TOKEN NAME *</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="My Token"
                    className="input-brutal"
                  />
                </div>

                <div>
                  <label className="caption text-neutral-500 block mb-3">SYMBOL *</label>
                  <input
                    value={formData.symbol}
                    onChange={(e) => setFormData(p => ({ ...p, symbol: e.target.value.toUpperCase() }))}
                    placeholder="TKN"
                    className="input-brutal font-mono"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="caption text-neutral-500 block mb-3">NFT COLLECTION *</label>
                  <input
                    value={formData.nftCollection}
                    onChange={(e) => setFormData(p => ({ ...p, nftCollection: e.target.value }))}
                    placeholder="0x..."
                    className="input-brutal font-mono text-sm"
                  />
                  {isAddress(formData.nftCollection) && nftSupply !== undefined && (
                    <p className="mt-2 text-xs text-neutral-500">
                      ✓ {nftName || 'Collection'} — {nftSupply.toString()} NFTs
                    </p>
                  )}
                  {isAddress(formData.nftCollection) && isSupplyError && (
                    <p className="mt-2 text-xs text-neutral-600">
                      ✗ Must implement ERC721Enumerable (totalSupply)
                    </p>
                  )}
                </div>

                <div>
                  <label className="caption text-neutral-500 block mb-3">DESCRIPTION</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Optional description..."
                    rows={3}
                    className="input-brutal resize-none"
                  />
                </div>

                <div className="border border-neutral-800 p-4">
                  <div className="caption text-neutral-500 mb-2">FEE DISTRIBUTION</div>
                  <p className="text-sm text-neutral-400">
                    80% → NFT Holders • 20% → Treasury
                  </p>
                </div>

                <button 
                  onClick={handleDeploy} 
                  disabled={isDeploying || isWaitingDeploy}
                  className="btn-primary w-full"
                >
                  {isDeploying || isWaitingDeploy ? 'DEPLOYING...' : 'DEPLOY TOKEN'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
