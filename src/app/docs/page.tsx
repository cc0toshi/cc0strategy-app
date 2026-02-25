import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="container-editorial section-spacing">
      {/* Header */}
      <div className="max-w-3xl mb-16">
        <div className="caption text-neutral-500 mb-4">TECHNICAL REFERENCE</div>
        <h1 className="font-editorial text-4xl md:headline-xl mb-4 md:mb-6">DOCS</h1>
        <p className="body-lg text-neutral-400">
          Complete technical documentation for cc0strategy. 
          Deployed on Base and Ethereum mainnet.
        </p>
      </div>

      {/* Divider */}
      <div className="divider-thick mb-16" />

      {/* Fork Notice */}
      <section className="mb-20">
        <div className="caption text-neutral-500 mb-4">TRANSPARENCY</div>
        <h2 className="font-editorial text-xl md:headline-md mb-6 md:mb-8">BUILT ON CLANKER</h2>
        
        <div className="border-2 border-white p-8 mb-6">
          <p className="text-neutral-300 mb-4">
            cc0strategy is a <strong className="text-white">fork of Clanker</strong>, the token launchpad built by the Clanker team. 
            We believe in transparency and giving credit where it&apos;s due.
          </p>
          <p className="text-neutral-400 text-sm mb-6">
            Clanker pioneered the Uniswap V4 hook-based token launchpad model. We forked their contracts 
            and modified them to serve a specific use case: directing trading fees to NFT holders.
          </p>
          <a 
            href="https://github.com/clanker-devco/v4-contracts" 
            target="_blank" 
            className="inline-block border border-white px-4 py-2 text-sm hover:bg-white hover:text-black transition-colors"
          >
            VIEW ORIGINAL CLANKER REPO →
          </a>
        </div>

        <h3 className="font-editorial font-bold text-lg mb-4">WHAT WE FORKED</h3>
        <ul className="space-y-2 text-neutral-400 text-sm mb-8">
          <li className="flex gap-3">
            <span className="text-white">•</span>
            <span><strong className="text-white">Clanker.sol</strong> — Factory contract for deploying tokens with Uniswap V4 pools</span>
          </li>
          <li className="flex gap-3">
            <span className="text-white">•</span>
            <span><strong className="text-white">ClankerToken.sol</strong> — Standard ERC-20 token template</span>
          </li>
          <li className="flex gap-3">
            <span className="text-white">•</span>
            <span><strong className="text-white">ClankerHook.sol</strong> — Uniswap V4 hook for fee collection (6.9% swap fee)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-white">•</span>
            <span><strong className="text-white">CC0StrategyLpLocker.sol</strong> — LP position locker to prevent rug pulls</span>
          </li>
        </ul>

        <h3 className="font-editorial font-bold text-lg mb-4">WHAT WE CHANGED</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border border-neutral-800 p-6">
            <h4 className="font-bold text-white mb-2">NFT FEE DISTRIBUTION</h4>
            <p className="text-neutral-400 text-sm">
              Added custom FeeDistributor that routes 80% of trading fees to NFT holders, 
              claimable per token ID. Original Clanker sends fees to deployer.
            </p>
          </div>
          <div className="border border-neutral-800 p-6">
            <h4 className="font-bold text-white mb-2">MULTI-CHAIN SUPPORT</h4>
            <p className="text-neutral-400 text-sm">
              Deployed to both Base and Ethereum mainnet. Factory supports deploying tokens 
              linked to NFT collections on either chain.
            </p>
          </div>
          <div className="border border-neutral-800 p-6">
            <h4 className="font-bold text-white mb-2">$CC0COMPANY BUYBACK</h4>
            <p className="text-neutral-400 text-sm">
              20% of fees go to treasury for strategic $CC0COMPANY token buyback, 
              supporting the cc0.company ecosystem.
            </p>
          </div>
        </div>
      </section>
      
      {/* Contract Addresses - Base */}
      <section className="mb-12">
        <div className="caption text-neutral-500 mb-4">DEPLOYMENTS (V2)</div>
        <h2 className="font-editorial text-xl md:headline-md mb-6 md:mb-8">BASE MAINNET</h2>
        
        <div className="space-y-0">
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">FACTORY</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              <a href="https://basescan.org/address/0xDbbC0A64fFe2a23b4543b0731CF61ef0d5d4E265" target="_blank" className="hover:text-white transition-colors">
                0xDbbC0A64fFe2a23b4543b0731CF61ef0d5d4E265
              </a>
            </div>
          </div>
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">FEE DISTRIBUTOR</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              <a href="https://basescan.org/address/0x498bcfdbd724989fc37259faba75168c8f47080d" target="_blank" className="hover:text-white transition-colors">
                0x498bcfdbd724989fc37259faba75168c8f47080d
              </a>
            </div>
          </div>
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">LP LOCKER</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              <a href="https://basescan.org/address/0x5821e651D6fBF096dB3cBD9a21FaE4F5A1E2620A" target="_blank" className="hover:text-white transition-colors">
                0x5821e651D6fBF096dB3cBD9a21FaE4F5A1E2620A
              </a>
            </div>
          </div>
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">HOOK</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              <a href="https://basescan.org/address/0x5eE3602f499cFEAa4E13D27b4F7D2661906b28cC" target="_blank" className="hover:text-white transition-colors">
                0x5eE3602f499cFEAa4E13D27b4F7D2661906b28cC
              </a>
            </div>
          </div>
          <div className="border-2 border-white p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">MEV MODULE</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              <a href="https://basescan.org/address/0x9EbA427CE82A4A780871D5AB098eF5EB6c590ffd" target="_blank" className="hover:text-white transition-colors">
                0x9EbA427CE82A4A780871D5AB098eF5EB6c590ffd
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contract Addresses - Ethereum */}
      <section className="mb-20">
        <h2 className="font-editorial text-xl md:headline-md mb-6 md:mb-8">ETHEREUM MAINNET</h2>
        
        <div className="space-y-0">
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">FACTORY</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              <a href="https://etherscan.io/address/0x1dc68bc05ecb132059fb45b281dbfa92b6fab610" target="_blank" className="hover:text-white transition-colors">
                0x1dc68bc05ecb132059fb45b281dbfa92b6fab610
              </a>
            </div>
          </div>
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">FEE DISTRIBUTOR</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              <a href="https://etherscan.io/address/0xdcfb59f2d41c58a1325b270c2f402c1884338d0d" target="_blank" className="hover:text-white transition-colors">
                0xdcfb59f2d41c58a1325b270c2f402c1884338d0d
              </a>
            </div>
          </div>
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">LP LOCKER</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              <a href="https://etherscan.io/address/0x05492c0091e49374e71c93e74739d3f650b59077" target="_blank" className="hover:text-white transition-colors">
                0x05492c0091e49374e71c93e74739d3f650b59077
              </a>
            </div>
          </div>
          <div className="border-2 border-white border-b-0 p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">HOOK</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              <a href="https://etherscan.io/address/0xEfd2F889eD9d7A2Bf6B6C9c2b20c5AEb6EBEe8Cc" target="_blank" className="hover:text-white transition-colors">
                0xEfd2F889eD9d7A2Bf6B6C9c2b20c5AEb6EBEe8Cc
              </a>
            </div>
          </div>
          <div className="border-2 border-white p-6 grid md:grid-cols-4 gap-4 items-center">
            <div className="font-editorial font-bold">MEV MODULE</div>
            <div className="md:col-span-3 font-mono text-sm text-neutral-400 break-all">
              <a href="https://etherscan.io/address/0x47bee4a3b92caa86009e00dbeb4d43e8dcc1e955" target="_blank" className="hover:text-white transition-colors">
                0x47bee4a3b92caa86009e00dbeb4d43e8dcc1e955
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="mb-20">
        <div className="caption text-neutral-500 mb-4">SYSTEM DESIGN</div>
        <h2 className="font-editorial text-xl md:headline-md mb-6 md:mb-8">ARCHITECTURE</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border-2 border-white p-8">
            <h3 className="font-editorial text-lg font-bold mb-4">FACTORY</h3>
            <p className="text-neutral-400 text-sm">
              Deploys new ERC-20 tokens linked to NFT collections. Each deployment creates 
              a Uniswap V4 pool with the custom fee hook attached. Collects 1.38% team fees.
            </p>
          </div>
          <div className="border-2 border-white p-8">
            <h3 className="font-editorial text-lg font-bold mb-4">HOOK</h3>
            <p className="text-neutral-400 text-sm">
              Uniswap V4 hook that captures 6.9% of every swap. 1.38% goes to Factory (team), 
              5.52% goes to LP position which flows to FeeDistributor.
            </p>
          </div>
          <div className="border-2 border-white p-8">
            <h3 className="font-editorial text-lg font-bold mb-4">FEE DISTRIBUTOR</h3>
            <p className="text-neutral-400 text-sm">
              Receives LP fees (5.52% of swaps) and distributes 100% to NFT holders,
              claimable per token ID. Treasury fees come from Factory separately.
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
        <h2 className="font-editorial text-xl md:headline-md mb-6 md:mb-8">HOW TO DEPLOY A TOKEN</h2>
        
        <div className="space-y-6">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 border-2 border-white flex items-center justify-center font-editorial font-bold shrink-0">
              1
            </div>
            <div>
              <h3 className="font-editorial font-bold mb-2">CONNECT YOUR WALLET</h3>
              <p className="text-neutral-400 text-sm">
                Use any EVM-compatible wallet on Base or Ethereum network.
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
                The Factory creates your token, pool, and configures the hook in a single transaction.
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
        <h2 className="font-editorial text-xl md:headline-md mb-6 md:mb-8">HOW TO CLAIM FEES</h2>
        
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
        <h2 className="font-editorial text-xl md:headline-md mb-6 md:mb-8">FEE BREAKDOWN</h2>
        
        <div className="border-2 border-white">
          <div className="grid grid-cols-2 border-b-2 border-white">
            <div className="p-6 font-editorial font-bold">SWAP FEE</div>
            <div className="p-6 text-right font-mono">6.9%</div>
          </div>
          <div className="grid grid-cols-2 border-b-2 border-white">
            <div className="p-6 font-editorial font-bold">TREASURY ($CC0COMPANY BUYBACK)</div>
            <div className="p-6 text-right font-mono">20% (1.38%)</div>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-6 font-editorial font-bold">NFT HOLDERS</div>
            <div className="p-6 text-right font-mono">80% (5.52%)</div>
          </div>
        </div>
        
        <div className="mt-6 text-sm text-neutral-500">
          <strong className="text-neutral-400">EXAMPLE:</strong> On a $100 swap, $6.90 goes to fees. 
          $1.38 goes to treasury for strategic $CC0COMPANY buyback, $5.52 is distributed among all NFT token IDs in the collection.
        </div>
        
        <div className="mt-4 text-sm text-neutral-500">
          <strong className="text-neutral-400">FEE FLOW:</strong> Hook takes 6.9% → 1.38% to Factory (claimable by team) → 5.52% to LP → LpLocker collects → FeeDistributor → 100% to NFT holders.
        </div>
      </section>

      {/* Links */}
      <section>
        <div className="caption text-neutral-500 mb-4">RESOURCES</div>
        <h2 className="font-editorial text-xl md:headline-md mb-6 md:mb-8">EXTERNAL LINKS</h2>
        
        <div className="space-y-4">
          <a 
            href="https://github.com/clanker-devco/v4-contracts" 
            target="_blank" 
            className="block border-2 border-white p-6 hover:bg-white hover:text-black transition-colors group"
          >
            <div className="flex justify-between items-center">
              <span className="font-editorial font-bold">ORIGINAL CLANKER CONTRACTS</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </a>
          <a 
            href="https://github.com/cc0toshi/cc0strategy" 
            target="_blank" 
            className="block border-2 border-white p-6 hover:bg-white hover:text-black transition-colors group"
          >
            <div className="flex justify-between items-center">
              <span className="font-editorial font-bold">CC0STRATEGY GITHUB</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </a>
          <a 
            href="https://basescan.org/address/0xDbbC0A64fFe2a23b4543b0731CF61ef0d5d4E265" 
            target="_blank" 
            className="block border-2 border-white p-6 hover:bg-white hover:text-black transition-colors group"
          >
            <div className="flex justify-between items-center">
              <span className="font-editorial font-bold">BASE FACTORY ON BASESCAN</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </a>
          <a 
            href="https://etherscan.io/address/0x1dc68bc05ecb132059fb45b281dbfa92b6fab610" 
            target="_blank" 
            className="block border-2 border-white p-6 hover:bg-white hover:text-black transition-colors group"
          >
            <div className="flex justify-between items-center">
              <span className="font-editorial font-bold">ETHEREUM FACTORY ON ETHERSCAN</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
