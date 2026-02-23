import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-80px)]">
      {/* HERO SECTION */}
      <section className="container-editorial section-spacing">
        <div className="max-w-4xl">
          {/* Eyebrow */}
          <div className="caption text-neutral-500 mb-6">
            UNISWAP V4 HOOKS • BASE MAINNET • 100% CC0
          </div>
          
          {/* Main headline */}
          <h1 className="font-editorial headline-xl mb-8">
            TRADING FEES<br />
            <span className="text-neutral-500">→</span> NFT HOLDERS
          </h1>
          
          {/* Subheadline */}
          <p className="body-lg text-neutral-400 max-w-2xl mb-12">
            Launch tokens linked to any NFT collection. 80% of swap fees flow 
            directly to NFT holders. No staking. No lockups. Just hold & earn.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4">
            <Link href="/deploy" className="btn-primary">
              Deploy Token
            </Link>
            <Link href="/browse" className="btn-secondary">
              Browse Tokens
            </Link>
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div className="divider-thick" />

      {/* FEATURES GRID */}
      <section className="container-editorial section-spacing">
        <div className="grid md:grid-cols-3 gap-0 border-2 border-white">
          {/* Feature 1 */}
          <Link 
            href="/swap"
            className="group p-8 border-b-2 md:border-b-0 md:border-r-2 border-white hover:bg-white hover:text-black transition-colors"
          >
            <div className="caption text-neutral-500 group-hover:text-neutral-600 mb-4">01</div>
            <h2 className="font-editorial text-2xl font-bold mb-4">SWAP</h2>
            <p className="text-neutral-400 group-hover:text-neutral-600">
              Trade tokens directly via Universal Router. Zero friction. Instant swaps.
            </p>
            <div className="mt-6 font-editorial text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              TRADE NOW →
            </div>
          </Link>
          
          {/* Feature 2 */}
          <Link 
            href="/claim"
            className="group p-8 border-b-2 md:border-b-0 md:border-r-2 border-white hover:bg-white hover:text-black transition-colors"
          >
            <div className="caption text-neutral-500 group-hover:text-neutral-600 mb-4">02</div>
            <h2 className="font-editorial text-2xl font-bold mb-4">CLAIM</h2>
            <p className="text-neutral-400 group-hover:text-neutral-600">
              NFT holders claim accumulated WETH rewards. Your NFT = your yield.
            </p>
            <div className="mt-6 font-editorial text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              CLAIM FEES →
            </div>
          </Link>
          
          {/* Feature 3 */}
          <Link 
            href="/deploy"
            className="group p-8 hover:bg-white hover:text-black transition-colors"
          >
            <div className="caption text-neutral-500 group-hover:text-neutral-600 mb-4">03</div>
            <h2 className="font-editorial text-2xl font-bold mb-4">DEPLOY</h2>
            <p className="text-neutral-400 group-hover:text-neutral-600">
              Launch a token linked to your NFT collection. Permissionless & instant.
            </p>
            <div className="mt-6 font-editorial text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              LAUNCH TOKEN →
            </div>
          </Link>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="bg-white text-black py-16">
        <div className="container-editorial">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-editorial headline-md mb-6">
                FEE DISTRIBUTION
              </h2>
              <p className="text-neutral-600 mb-8">
                Every swap generates a 1% fee. This fee is automatically captured 
                and distributed between NFT holders and the protocol treasury.
              </p>
              <Link href="/about" className="btn-ghost text-black">
                Learn More →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="border-2 border-black p-6 text-center">
                <div className="font-editorial text-5xl font-bold">80%</div>
                <div className="caption text-neutral-600 mt-2">NFT HOLDERS</div>
              </div>
              <div className="border-2 border-black p-6 text-center">
                <div className="font-editorial text-5xl font-bold">20%</div>
                <div className="caption text-neutral-600 mt-2">TREASURY</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-editorial section-spacing">
        <div className="mb-12">
          <div className="caption text-neutral-500 mb-4">HOW IT WORKS</div>
          <h2 className="font-editorial headline-md">THREE SIMPLE STEPS</h2>
        </div>
        
        <div className="space-y-0">
          <div className="border-2 border-white border-b-0 p-8 flex items-start gap-8">
            <div className="font-editorial text-4xl font-bold text-neutral-600">01</div>
            <div>
              <h3 className="font-editorial text-xl font-bold mb-2">DEPLOY A TOKEN</h3>
              <p className="text-neutral-400">
                Link any ERC-721 collection to a new ERC-20 token. The token launches 
                with a Uniswap V4 pool using our custom fee-capturing hook.
              </p>
            </div>
          </div>
          <div className="border-2 border-white border-b-0 p-8 flex items-start gap-8">
            <div className="font-editorial text-4xl font-bold text-neutral-600">02</div>
            <div>
              <h3 className="font-editorial text-xl font-bold mb-2">FEES ACCUMULATE</h3>
              <p className="text-neutral-400">
                Every swap incurs a 1% fee. This is automatically captured by our hook 
                and sent to the FeeDistributor contract.
              </p>
            </div>
          </div>
          <div className="border-2 border-white p-8 flex items-start gap-8">
            <div className="font-editorial text-4xl font-bold text-neutral-600">03</div>
            <div>
              <h3 className="font-editorial text-xl font-bold mb-2">HOLDERS CLAIM</h3>
              <p className="text-neutral-400">
                NFT holders claim their proportional share anytime. Each token ID receives 
                an equal portion of the 80% holder allocation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="border-y-2 border-white">
        <div className="container-editorial py-16 text-center">
          <h2 className="font-editorial headline-lg mb-6">
            READY TO LAUNCH?
          </h2>
          <p className="text-neutral-400 mb-8 max-w-xl mx-auto">
            Deploy your own token in minutes. No code required. 
            Just connect your wallet and go.
          </p>
          <Link href="/deploy" className="btn-primary">
            Deploy Token
          </Link>
        </div>
      </section>
    </div>
  );
}
