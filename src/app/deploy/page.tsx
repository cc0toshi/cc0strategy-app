// @ts-nocheck
'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSwitchChain, useChainId } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseAbi, Address, isAddress, decodeEventLog, encodeAbiParameters, parseAbiParameters } from 'viem';

import { CONTRACTS, getContracts, getChainFromId, CHAIN_IDS, hasDeployedContracts, type SupportedChain } from '@/config/contracts';
import { base, mainnet } from '@/config/wagmi';

// Config addresses - will be set based on selected network
// Use chain-specific MEV module from contracts config

// ABIs
// IMPORTANT: The deployToken function takes a SINGLE DeploymentConfig struct parameter
// The struct must be wrapped in an outer tuple - notice the extra parentheses wrapping all parameters
const factoryAbi = parseAbi([
  'function deployToken(((address tokenAdmin, string name, string symbol, bytes32 salt, string image, string metadata, string context, uint256 originatingChainId) tokenConfig, (address hook, address pairedToken, int24 tickIfToken0IsClanker, int24 tickSpacing, bytes poolData) poolConfig, (address locker, address[] rewardAdmins, address[] rewardRecipients, uint16[] rewardBps, int24[] tickLower, int24[] tickUpper, uint16[] positionBps, bytes lockerData) lockerConfig, (address mevModule, bytes mevModuleData) mevModuleConfig, (address extension, uint256 msgValue, uint16 extensionBps, bytes extensionData)[] extensionConfigs, address nftCollection) deploymentConfig) external payable returns (address)',
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

const feeDistributorAbi = parseAbi([
  'function register(address token, address nftCollection) external',
]);

type DeployStep = 'idle' | 'uploading' | 'validating' | 'deploying' | 'confirming' | 'registering' | 'renouncing' | 'saving' | 'done' | 'error';

export default function DeployPage() {
  const chainId = useChainId();
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  
  // Determine current chain and get contracts
  const currentChain = getChainFromId(chainId);
  
  const [selectedNetwork, setSelectedNetwork] = useState<SupportedChain>('base');
  const chainContracts = getContracts(selectedNetwork);
  
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
  const [deployedPoolId, setDeployedPoolId] = useState<string | null>(null);
  const [nftInfo, setNftInfo] = useState<{ name: string; symbol: string; supply: bigint } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { writeContract, data: deployHash, isPending: isDeploying, error: deployError } = useWriteContract();
  const { writeContract: registerWrite, data: registerHash, isPending: isRegistering, error: registerError } = useWriteContract();
  const { writeContract: renounceWrite, data: renounceHash, isPending: isRenouncing, error: renounceError } = useWriteContract();
  
  const { isLoading: isWaitingDeploy, isSuccess: isDeploySuccess, data: deployReceipt } = useWaitForTransactionReceipt({
    hash: deployHash,
  });
  
  const { isLoading: isWaitingRegister, isSuccess: isRegisterSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
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

  // Handle network selection
  const handleNetworkSelect = (network: SupportedChain) => {
    setSelectedNetwork(network);
    // Switch wallet chain if needed
    const targetChainId = network === 'base' ? base.id : mainnet.id;
    if (chainId !== targetChainId) {
      switchChain({ chainId: targetChainId });
    }
  };

  useEffect(() => {
    if (isDeploySuccess && deployReceipt && step === 'confirming') {
      // Find the TokenCreated event from Factory
      const factoryAddr = chainContracts.FACTORY?.toLowerCase();
      const tokenCreatedLog = deployReceipt.logs.find(log => {
        try {
          // TokenCreated event has 3 indexed params (msgSender, tokenAddress, tokenAdmin)
          return log.address.toLowerCase() === factoryAddr && log.topics.length >= 3;
        } catch {
          return false;
        }
      });

      if (tokenCreatedLog && tokenCreatedLog.topics[1]) {
        // Token address is first indexed param (topics[1])
        const tokenAddr = `0x${tokenCreatedLog.topics[1].slice(26)}` as Address;
        setDeployedToken(tokenAddr);
        
        // Decode the event data to extract poolId
        // Event: TokenCreated(msgSender, indexed tokenAddress, indexed tokenAdmin, image, name, symbol, metadata, context, startingTick, poolHook, poolId, pairedToken, locker, mevModule, extensionsSupply, extensions[])
        try {
          const decoded = decodeEventLog({
            abi: factoryAbi,
            data: tokenCreatedLog.data,
            topics: tokenCreatedLog.topics,
          });
          
          if (decoded.args && 'poolId' in decoded.args) {
            const poolId = decoded.args.poolId as `0x${string}`;
            console.log('Extracted poolId:', poolId);
            setDeployedPoolId(poolId);
          } else {
            console.warn('poolId not found in event args');
          }
        } catch (e) {
          console.error('Failed to decode TokenCreated event:', e);
          // Continue without poolId - we'll get it from transaction receipt
        }
        
        // Register with FeeDistributor
        if (chainContracts.FEE_DISTRIBUTOR) {
          setStep('registering');
          registerWrite({
            address: chainContracts.FEE_DISTRIBUTOR,
            abi: feeDistributorAbi,
            functionName: 'register',
            args: [tokenAddr, formData.nftCollection as Address],
          });
        } else {
          // Skip registration if FeeDistributor not deployed
          setStep('renouncing');
          renounceWrite({
            address: tokenAddr,
            abi: ownableAbi,
            functionName: 'renounceOwnership',
          });
        }
      } else {
        setError('Could not find deployed token address');
        setStep('error');
      }
    }
  }, [isDeploySuccess, deployReceipt, step, registerWrite, formData.nftCollection, chainContracts]);

  // After FeeDistributor registration, renounce ownership
  useEffect(() => {
    if (isRegisterSuccess && deployedToken && step === 'registering') {
      setStep('renouncing');
      renounceWrite({
        address: deployedToken as Address,
        abi: ownableAbi,
        functionName: 'renounceOwnership',
      });
    }
  }, [isRegisterSuccess, deployedToken, step, renounceWrite]);

  // After renounce, save to database
  useEffect(() => {
    if (isRenounceSuccess && step === 'renouncing' && deployedToken && deployHash) {
      setStep('saving');
      
      // Save to database - MUST include pool_id for swap to work
      fetch('/api/tokens/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: deployedToken,
          name: formData.name,
          symbol: formData.symbol,
          nftCollection: formData.nftCollection,
          deployer: address,
          deployTxHash: deployHash,
          imageUrl: ipfsUrl,
          description: formData.description,
          chain: selectedNetwork,
          poolId: deployedPoolId, // CRITICAL: Include pool_id for swap functionality
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            console.error('Failed to save token:', data.error);
          }
          setStep('done');
        })
        .catch(err => {
          console.error('Failed to save token:', err);
          setStep('done'); // Still mark as done even if save fails
        });
    }
  }, [isRenounceSuccess, step, deployedToken, deployHash, formData, address, ipfsUrl, selectedNetwork, deployedPoolId]);

  useEffect(() => {
    if (deployError) {
      setError(deployError.message);
      setStep('error');
    }
    if (registerError) {
      setError(`Token deployed but FeeDistributor registration failed: ${registerError.message}`);
      // Still try to renounce
      if (deployedToken) {
        setStep('renouncing');
        renounceWrite({
          address: deployedToken as Address,
          abi: ownableAbi,
          functionName: 'renounceOwnership',
        });
      }
    }
    if (renounceError) {
      setError(`Token deployed but renounce failed: ${renounceError.message}`);
      setStep('done');
    }
  }, [deployError, registerError, renounceError, deployedToken, renounceWrite]);

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
    
    if (!chainContracts.FACTORY) {
      setError('Factory contract not deployed on this network yet');
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
        originatingChainId: BigInt(CHAIN_IDS[selectedNetwork]),
      };
      
      // Encode PoolInitializationData struct for poolData
      // struct PoolInitializationData { address extension; bytes extensionData; bytes feeData; }
      const poolData = encodeAbiParameters(
        parseAbiParameters('address extension, bytes extensionData, bytes feeData'),
        ['0x0000000000000000000000000000000000000000', '0x', '0x']
      );
      
      const poolConfig = {
        hook: chainContracts.HOOK as Address,
        pairedToken: chainContracts.WETH as Address,
        tickIfToken0IsClanker: -200 as number,  // Starting tick (token starts lower than WETH)
        tickSpacing: 200 as number,
        poolData: poolData,
      };
      
      // Locker config with single full-range position
      // tickLower must be >= startingTick (-200) and multiple of tickSpacing (200)
      // tickUpper should be large multiple of 200 (887200 is near max tick)
      // positionBps must sum to 10000 (100%)
      const lockerConfig = {
        locker: (chainContracts.LP_LOCKER || '0x0000000000000000000000000000000000000000') as Address,
        rewardAdmins: [] as Address[],
        rewardRecipients: [] as Address[],
        rewardBps: [] as number[],
        tickLower: [-200] as number[],       // Starting tick
        tickUpper: [887200] as number[],     // Near max tick (multiple of 200)
        positionBps: [10000] as number[],    // 100% in single position
        lockerData: '0x' as `0x${string}`,
      };
      
      const mevModuleConfig = {
        mevModule: chainContracts.MEV_MODULE as Address,
        mevModuleData: '0x' as `0x${string}`,
      };
      
      // DeploymentConfig is a SINGLE struct parameter containing all config
      const deploymentConfig = {
        tokenConfig,
        poolConfig,
        lockerConfig,
        mevModuleConfig,
        extensionConfigs: [],
        nftCollection: formData.nftCollection as Address,
      };
      
      writeContract({
        address: chainContracts.FACTORY,
        abi: factoryAbi,
        functionName: 'deployToken',
        args: [deploymentConfig],
      });
      
      setStep('confirming');
      
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const getStepStatus = (targetStep: DeployStep) => {
    const stepOrder: DeployStep[] = ['idle', 'uploading', 'validating', 'deploying', 'confirming', 'registering', 'renouncing', 'saving', 'done'];
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
    setSelectedNetwork('base');
    setFormData({ name: '', symbol: '', nftCollection: '', description: '' });
    setImageFile(null);
    setImagePreview(null);
    setIpfsUrl(null);
    setDeployedToken(null);
    setDeployedPoolId(null);
    setNftInfo(null);
    setError(null);
  };

  const canDeploy = hasDeployedContracts(selectedNetwork);

  return (
    <div className="container-editorial py-8 md:py-24">
      {/* Header */}
      <div className="mb-12">
        <div className="caption text-neutral-500 mb-4">TOKEN FACTORY</div>
        <h1 className="font-editorial text-2xl md:headline-lg">DEPLOY TOKEN</h1>
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
                <StepIndicator stepName="registering" label="Register with FeeDistributor" number="5" />
                <StepIndicator stepName="renouncing" label="Renounce Ownership" number="6" />
                <StepIndicator stepName="saving" label="Save to Database" number="7" />
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

              {/* Network Selector */}
              <div className="border-b-2 border-white p-4">
                <label className="caption text-neutral-500 block mb-3">NETWORK</label>
                <div className="flex gap-0">
                  <button
                    onClick={() => handleNetworkSelect('base')}
                    className={`flex-1 py-3 px-4 border-2 border-r-0 font-mono text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                      selectedNetwork === 'base'
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
                    onClick={() => handleNetworkSelect('ethereum')}
                    className={`flex-1 py-3 px-4 border-2 font-mono text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 relative ${
                      selectedNetwork === 'ethereum'
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
                    {!hasDeployedContracts('ethereum') && (
                      <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] px-2 py-0.5 font-mono rounded">
                        SOON
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Show warning if contracts not deployed */}
                {!canDeploy && (
                  <div className="border-2 border-yellow-500/50 bg-yellow-500/10 p-4 text-sm text-yellow-400">
                    ⚠️ {selectedNetwork.toUpperCase()} contracts not deployed yet. Deployment coming soon!
                  </div>
                )}

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
                    80% → NFT Holders • 10% → Treasury • 10% → Buyback
                  </p>
                </div>

                <button 
                  onClick={handleDeploy} 
                  disabled={isDeploying || isWaitingDeploy || !canDeploy}
                  className="btn-primary w-full"
                >
                  {!canDeploy ? 'COMING SOON' :
                   isDeploying || isWaitingDeploy ? 'DEPLOYING...' : 'DEPLOY TOKEN'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
