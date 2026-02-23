import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="container-editorial section-spacing">
      {/* Hero */}
      <div className="max-w-3xl mb-20">
        <div className="caption text-neutral-500 mb-4">ABOUT</div>
        <h1 className="font-editorial headline-xl mb-8">
          FEES TO<br />HOLDERS
        </h1>
        <p className="body-lg text-neutral-400 mb-6">
          cc0strategy is a token launchpad where trading fees flow directly to NFT holders. 
          Built on Uniswap V4 hooks, it creates a new primitive for NFT-backed tokens with 
          sustainable yield mechanics.
        </p>
        <p className="body-lg text-neutral-400">
          Every swap generates a 1% fee that gets captured by our custom hook and distributed 
          proportionally to NFT holders. No staking required — just hold the NFT and claim 
          your share of trading fees.
        </p>
      </div>

      {/* Divider */}
      <div className="divider-thick mb-20" />

      {/* How It Works */}
      <section className="mb-20">
        <div className="caption text-neutral-500 mb-4">MECHANICS</div>
        <h2 className="font-editorial headline-md mb-12">HOW IT WORKS</h2>
        
        <div className="space-y-0">
          <div className="border-2 border-white border-b-0 p-8 grid md:grid-cols-12 gap-8">
            <div className="md:col-span-2">
              <span className="font-editorial text-4xl font-bold text-neutral-600">01</span>
            </div>
            <div className="md:col-span-10">
              <h3 className="font-editorial text-xl font-bold mb-4">DEPLOY A TOKEN</h3>
              <p className="text-neutral-400">
                Link any NFT collection to a new ERC-20 token. The token launches with a 
                Uniswap V4 pool using our custom fee-capturing hook. Permissionless and instant.
              </p>
            </div>
          </div>
          
          <div className="border-2 border-white border-b-0 p-8 grid md:grid-cols-12 gap-8">
            <div className="md:col-span-2">
              <span className="font-editorial text-4xl font-bold text-neutral-600">02</span>
            </div>
            <div className="md:col-span-10">
              <h3 className="font-editorial text-xl font-bold mb-4">TRADING FEES ACCUMULATE</h3>
              <p className="text-neutral-400">
                Every swap on the token incurs a 1% fee. This fee is automatically captured 
                by the hook contract and sent to the FeeDistributor.
              </p>
            </div>
          </div>
          
          <div className="border-2 border-white p-8 grid md:grid-cols-12 gap-8">
            <div className="md:col-span-2">
              <span className="font-editorial text-4xl font-bold text-neutral-600">03</span>
            </div>
            <div className="md:col-span-10">
              <h3 className="font-editorial text-xl font-bold mb-4">NFT HOLDERS CLAIM</h3>
              <p className="text-neutral-400">
                NFT holders can claim their proportional share of accumulated fees at any time. 
                Each NFT token ID receives an equal portion of the 80% holder allocation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fee Distribution */}
      <section className="mb-20">
        <div className="caption text-neutral-500 mb-4">ECONOMICS</div>
        <h2 className="font-editorial headline-md mb-12">FEE DISTRIBUTION</h2>
        
        <div className="bg-white text-black">
          <div className="grid md:grid-cols-2">
            <div className="p-12 border-r-2 border-black text-center">
              <div className="font-editorial text-7xl font-bold mb-4">80%</div>
              <div className="caption text-neutral-600 mb-4">NFT HOLDERS</div>
              <p className="text-neutral-600 text-sm max-w-xs mx-auto">
                Distributed proportionally across all token IDs in the linked NFT collection
              </p>
            </div>
            <div className="p-12 text-center">
              <div className="font-editorial text-7xl font-bold mb-4">20%</div>
              <div className="caption text-neutral-600 mb-4">TREASURY</div>
              <p className="text-neutral-600 text-sm max-w-xs mx-auto">
                Goes to cc0toshi for protocol development and maintenance
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="mb-20">
        <div className="caption text-neutral-500 mb-4">BENEFITS</div>
        <h2 className="font-editorial headline-md mb-12">WHY CC0STRATEGY</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border-2 border-white p-8">
            <h3 className="font-editorial text-lg font-bold mb-4">NO STAKING REQUIRED</h3>
            <p className="text-neutral-400">
              Simply holding the NFT entitles you to fee claims. 
              No lockups, no complicated staking mechanics.
            </p>
          </div>
          
          <div className="border-2 border-white p-8">
            <h3 className="font-editorial text-lg font-bold mb-4">SUSTAINABLE YIELD</h3>
            <p className="text-neutral-400">
              Fees come from real trading activity, not token emissions. 
              True value creation, not dilution.
            </p>
          </div>
          
          <div className="border-2 border-white p-8">
            <h3 className="font-editorial text-lg font-bold mb-4">PERMISSIONLESS</h3>
            <p className="text-neutral-400">
              Anyone can deploy a token linked to their NFT collection. 
              No gatekeepers, no approvals needed.
            </p>
          </div>
          
          <div className="border-2 border-white p-8">
            <h3 className="font-editorial text-lg font-bold mb-4">100% CC0</h3>
            <p className="text-neutral-400">
              All contracts and code are in the public domain. 
              Fork it, modify it, build on it freely.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-2 border-white p-12 text-center">
        <h2 className="font-editorial headline-md mb-6">GET STARTED</h2>
        <p className="text-neutral-400 mb-8 max-w-lg mx-auto">
          See the full technical details and contract addresses in our documentation, 
          or deploy your first token now.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/docs" className="btn-secondary">
            READ DOCS
          </Link>
          <Link href="/deploy" className="btn-primary">
            DEPLOY TOKEN
          </Link>
        </div>
      </section>
    </div>
  );
}
