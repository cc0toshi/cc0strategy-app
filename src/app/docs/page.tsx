import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="container-editorial section-spacing">
      {/* Header */}
      <div className="max-w-3xl mb-16">
        <div className="caption text-neutral-500 mb-4">TECHNICAL REFERENCE</div>
        <h1 className="font-editorial headline-xl mb-6">DOCS</h1>
        <p className="body-lg text-neutral-400">
          Complete technical documentation for cc0strategy. 
          All contracts are deployed on Base mainnet.
        </p>
      </div>

      {/* Divider */}
      <div className="divider-thick mb-16" />
      
      {/* Contract Addresses */}
      <section className="mb-20">
        <div className="caption text-neutral-500 mb-4">DEPLOYMENTS</div>
        <h2 className="font-editorial headline-md mb-8">CONTRACT ADDRESSES</h2>
        
        <div className="space-y-0">
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">FACTORY</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              0x70b17db500Ce1746BB34f908140d0279C183f3eb
            </div>
          </div>
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">FEE DISTRIBUTOR</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              0x9Ce2AB2769CcB547aAcE963ea4493001275CD557
            </div>
          </div>
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">LP LOCKER</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              0x45e1D9bb68E514565710DEaf2567B73EF86638e0
            </div>
          </div>
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">HOOK</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              0x18aD8c9b72D33E69d8f02fDA61e3c7fAe4e728cc
            </div>
          </div>
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">UNIVERSAL ROUTER</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              0x6fF5693b99212Da76ad316178A184AB56D299b43
            </div>
          </div>
          <div className="border-2 border-white p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">POOL MANAGER</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              0x498581fF718922c3f8e6A244956aF099B2652b2b
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="mb-20">
        <div className="caption text-neutral-500 mb-4">SYSTEM DESIGN</div>
        <h2 className="font-editorial headline-md mb-8">ARCHITECTURE</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border-2 border-white p-8">
            <h3 className="font-editorial text-lg font-bold mb-4">FACTORY</h3>
            <p className="text-neutral-400 text-sm">
              Deploys new ERC-20 tokens linked to NFT collections. Each deployment creates 
              a Uniswap V4 pool with the custom fee hook attached.
            </p>
          </div>
          <div className="border-2 border-white p-8">
            <h3 className="font-editorial text-lg font-bold mb-4">HOOK</h3>
            <p className="text-neutral-400 text-sm">
              Uniswap V4 hook that captures 1% of every swap. Fees are automatically 
              forwarded to the FeeDistributor contract.
            </p>
          </div>
          <div className="border-2 border-white p-8">
            <h3 className="font-editorial text-lg font-bold mb-4">FEE DISTRIBUTOR</h3>
            <p className="text-neutral-400 text-sm">
              Receives accumulated fees and distributes them. 20% to treasury, 80% claimable 
              by NFT holders proportionally by token ID.
            </p>
          </div>
          <div className="border-2 border-white p-8">
            <h3 className="font-editorial text-lg font-bold mb-4">LP LOCKER</h3>
            <p className="text-neutral-400 text-sm">
              Locks LP positions to ensure liquidity remains in the pool. Prevents rug pulls 
              by making initial liquidity permanent.
            </p>
          </div>
        </div>
      </section>

      {/* How to Deploy */}
      <section className="mb-20">
        <div className="caption text-neutral-500 mb-4">GUIDE</div>
        <h2 className="font-editorial headline-md mb-8">HOW TO DEPLOY A TOKEN</h2>
        
        <div className="space-y-6">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 border-2 border-white flex items-center justify-center font-editorial font-bold shrink-0">
              1
            </div>
            <div>
              <h3 className="font-editorial font-bold mb-2">CONNECT YOUR WALLET</h3>
              <p className="text-neutral-400 text-sm">
                Use any EVM-compatible wallet on Base network.
              </p>
            </div>
          </div>
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 border-2 border-white flex items-center justify-center font-editorial font-bold shrink-0">
              2
            </div>
            <div>
              <h3 className="font-editorial font-bold mb-2">ENTER TOKEN DETAILS</h3>
              <p className="text-neutral-400 text-sm">
                Name, symbol, and the NFT collection address to link.
              </p>
            </div>
          </div>
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 border-2 border-white flex items-center justify-center font-editorial font-bold shrink-0">
              3
            </div>
            <div>
              <h3 className="font-editorial font-bold mb-2">DEPLOY</h3>
              <p className="text-neutral-400 text-sm">
                The Factory creates your token, pool, and configures the hook.
              </p>
            </div>
          </div>
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 border-2 border-white flex items-center justify-center font-editorial font-bold shrink-0">
              4
            </div>
            <div>
              <h3 className="font-editorial font-bold mb-2">DONE</h3>
              <p className="text-neutral-400 text-sm">
                Trading can begin immediately. Fees accumulate from the first swap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Claim */}
      <section className="mb-20">
        <div className="caption text-neutral-500 mb-4">GUIDE</div>
        <h2 className="font-editorial headline-md mb-8">HOW TO CLAIM FEES</h2>
        
        <div className="space-y-6">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 border-2 border-white flex items-center justify-center font-editorial font-bold shrink-0">
              1
            </div>
            <div>
              <h3 className="font-editorial font-bold mb-2">HOLD NFTS</h3>
              <p className="text-neutral-400 text-sm">
                You must own NFTs from the linked collection.
              </p>
            </div>
          </div>
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 border-2 border-white flex items-center justify-center font-editorial font-bold shrink-0">
              2
            </div>
            <div>
              <h3 className="font-editorial font-bold mb-2">ENTER TOKEN IDS</h3>
              <p className="text-neutral-400 text-sm">
                Specify which NFT token IDs you want to claim for.
              </p>
            </div>
          </div>
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 border-2 border-white flex items-center justify-center font-editorial font-bold shrink-0">
              3
            </div>
            <div>
              <h3 className="font-editorial font-bold mb-2">CLAIM</h3>
              <p className="text-neutral-400 text-sm">
                Call the claim function to receive your accumulated WETH.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 border border-neutral-800 p-6 text-sm text-neutral-500">
          <strong className="text-neutral-400">NOTE:</strong> Claims are based on current NFT ownership. 
          If you sell an NFT, the new owner can claim any unclaimed fees for that token ID.
        </div>
      </section>

      {/* Fee Breakdown */}
      <section className="mb-20">
        <div className="caption text-neutral-500 mb-4">ECONOMICS</div>
        <h2 className="font-editorial headline-md mb-8">FEE BREAKDOWN</h2>
        
        <div className="border-2 border-white">
          <div className="grid grid-cols-2 border-b-2 border-white">
            <div className="p-6 font-editorial font-bold">SWAP FEE</div>
            <div className="p-6 text-right font-mono">1%</div>
          </div>
          <div className="grid grid-cols-2 border-b-2 border-white">
            <div className="p-6 font-editorial font-bold">TREASURY SHARE</div>
            <div className="p-6 text-right font-mono">20% OF FEES</div>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-6 font-editorial font-bold">NFT HOLDER SHARE</div>
            <div className="p-6 text-right font-mono">80% OF FEES</div>
          </div>
        </div>
        
        <div className="mt-6 text-sm text-neutral-500">
          <strong className="text-neutral-400">EXAMPLE:</strong> On a $100 swap, $1 goes to fees. 
          $0.20 to treasury, $0.80 distributed among all NFT token IDs in the collection.
        </div>
      </section>

      {/* Links */}
      <section>
        <div className="caption text-neutral-500 mb-4">RESOURCES</div>
        <h2 className="font-editorial headline-md mb-8">EXTERNAL LINKS</h2>
        
        <div className="space-y-4">
          <a 
            href="https://basescan.org/address/0x70b17db500Ce1746BB34f908140d0279C183f3eb" 
            target="_blank" 
            className="block border-2 border-white p-6 hover:bg-white hover:text-black transition-colors group"
          >
            <div className="flex justify-between items-center">
              <span className="font-editorial font-bold">FACTORY ON BASESCAN</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </a>
          <a 
            href="https://basescan.org/address/0x9Ce2AB2769CcB547aAcE963ea4493001275CD557" 
            target="_blank" 
            className="block border-2 border-white p-6 hover:bg-white hover:text-black transition-colors group"
          >
            <div className="flex justify-between items-center">
              <span className="font-editorial font-bold">FEE DISTRIBUTOR ON BASESCAN</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </a>
          <a 
            href="https://github.com/cc0toshi/cc0strategy" 
            target="_blank" 
            className="block border-2 border-white p-6 hover:bg-white hover:text-black transition-colors group"
          >
            <div className="flex justify-between items-center">
              <span className="font-editorial font-bold">GITHUB REPOSITORY</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
