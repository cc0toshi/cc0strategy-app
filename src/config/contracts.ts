// cc0strategy contract addresses on Base
export const CONTRACTS = {
  // Core
  FACTORY: '0x70b17db500Ce1746BB34f908140d0279C183f3eb' as const,
  FEE_DISTRIBUTOR: '0x9Ce2AB2769CcB547aAcE963ea4493001275CD557' as const,
  LP_LOCKER: '0x45e1D9bb68E514565710DEaf2567B73EF86638e0' as const,
  HOOK: '0x18aD8c9b72D33E69d8f02fDA61e3c7fAe4e728cc' as const,
  
  // Uniswap V4
  POOL_MANAGER: '0x498581fF718922c3f8e6A244956aF099B2652b2b' as const,
  POSITION_MANAGER: '0x7C5f5A4bBd8fD63184577525326123B519429bDc' as const,
  UNIVERSAL_ROUTER: '0x6fF5693b99212Da76ad316178A184AB56D299b43' as const,
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const,
  
  // Tokens
  WETH: '0x4200000000000000000000000000000000000006' as const,
  
  // DICKSTR (first token)
  DICKSTR: {
    TOKEN: '0x3b68C3B4e22E35Faf5841D1b5Eef8404D5A3b663' as const,
    POOL_ID: '0x34fc0d2eb125338f44d3001c5a5fd626aad60d98b763082b7fbdec8a6d501f30' as const,
    NFT_COLLECTION: '0x0000000000000000000000000000000000000000' as const, // TODO: update with actual NFT
  }
} as const;

// Pool Key structure for V4
export interface PoolKey {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
}

// Create pool key for DICKSTR
export const DICKSTR_POOL_KEY: PoolKey = {
  currency0: CONTRACTS.DICKSTR.TOKEN,
  currency1: CONTRACTS.WETH,
  fee: 8388608, // DYNAMIC_FEE_FLAG
  tickSpacing: 200,
  hooks: CONTRACTS.HOOK,
};
