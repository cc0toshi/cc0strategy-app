import type { Metadata } from 'next';
import { Space_Mono, IBM_Plex_Sans } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { Providers } from '@/components/Providers';
import { NavSearch } from '@/components/NavSearch';

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex',
});

export const metadata: Metadata = {
  title: 'CC0STRATEGY — NFT-Powered Token Launchpad',
  description: 'Launch tokens where trading fees flow directly to NFT holders. Built on Uniswap V4.',
  openGraph: {
    title: 'CC0STRATEGY — NFT-Powered Token Launchpad',
    description: 'Launch tokens where trading fees flow directly to NFT holders. 6.9% swap fee, 80% to NFT holders.',
    url: 'https://cc0strategy.fun',
    siteName: 'CC0STRATEGY',
    images: [
      {
        url: 'https://gateway.pinata.cloud/ipfs/QmXxf6JPYjEcHrhJfh5iuzsL5CAnoFyqEcY1NAgLdUER8R',
        width: 1200,
        height: 630,
        alt: 'CC0STRATEGY - NFT-Powered Token Launchpad',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CC0STRATEGY — NFT-Powered Token Launchpad',
    description: 'Launch tokens where trading fees flow directly to NFT holders. 6.9% swap fee, 80% to NFT holders.',
    images: ['https://gateway.pinata.cloud/ipfs/QmXxf6JPYjEcHrhJfh5iuzsL5CAnoFyqEcY1NAgLdUER8R'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${ibmPlex.variable}`}>
      <body className="bg-black text-white antialiased font-sans">
        <Providers>
          <div className="min-h-screen flex flex-col">
            {/* Navigation */}
            <nav className="border-b-2 border-white">
              <div className="container-editorial">
                <div className="flex items-center justify-between h-16 md:h-20">
                  {/* Logo + Search */}
                  <div className="flex items-center gap-4 md:gap-6">
                    <Link 
                      href="/" 
                      className="font-editorial text-lg md:text-2xl font-bold tracking-tight hover:opacity-60 transition-opacity"
                    >
                      CC0STRATEGY
                    </Link>
                    <div className="hidden md:block">
                      <NavSearch />
                    </div>
                  </div>
                  
                  {/* Desktop Navigation Links */}
                  <div className="hidden md:flex items-center gap-8">
                    <Link href="/browse" className="font-editorial text-sm uppercase tracking-widest hover:opacity-60 transition-opacity link-underline">
                      Browse
                    </Link>
                    <Link href="/swap" className="font-editorial text-sm uppercase tracking-widest hover:opacity-60 transition-opacity link-underline">
                      Trade
                    </Link>
                    <Link href="/claim" className="font-editorial text-sm uppercase tracking-widest hover:opacity-60 transition-opacity link-underline">
                      Claim
                    </Link>
                    <Link href="/deploy" className="font-editorial text-sm uppercase tracking-widest hover:opacity-60 transition-opacity link-underline">
                      Deploy
                    </Link>
                    <Link href="/docs" className="font-editorial text-sm uppercase tracking-widest text-neutral-500 hover:text-white transition-colors link-underline">
                      Docs
                    </Link>
                    {/* Wallet/Portfolio Icon */}
                    <Link href="/portfolio" className="hover:opacity-60 transition-opacity" title="Portfolio">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </Link>
                  </div>

                  {/* Mobile Menu */}
                  <div className="md:hidden flex items-center gap-3">
                    <Link href="/swap" className="font-editorial text-xs uppercase tracking-widest border border-white px-3 py-2 hover:bg-white hover:text-black transition-colors">
                      Trade
                    </Link>
                    <Link href="/portfolio" className="hover:opacity-60 transition-opacity" title="Portfolio">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </Link>
                    <details className="relative group">
                      <summary className="list-none cursor-pointer p-2 hover:opacity-60">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </summary>
                      <div className="absolute right-0 top-full mt-2 w-48 bg-black border-2 border-white z-50">
                        <Link href="/browse" className="block px-4 py-3 text-sm uppercase tracking-wider border-b border-neutral-800 hover:bg-white hover:text-black transition-colors">Browse</Link>
                        <Link href="/swap" className="block px-4 py-3 text-sm uppercase tracking-wider border-b border-neutral-800 hover:bg-white hover:text-black transition-colors">Trade</Link>
                        <Link href="/claim" className="block px-4 py-3 text-sm uppercase tracking-wider border-b border-neutral-800 hover:bg-white hover:text-black transition-colors">Claim</Link>
                        <Link href="/portfolio" className="block px-4 py-3 text-sm uppercase tracking-wider border-b border-neutral-800 hover:bg-white hover:text-black transition-colors">Portfolio</Link>
                        <Link href="/deploy" className="block px-4 py-3 text-sm uppercase tracking-wider border-b border-neutral-800 hover:bg-white hover:text-black transition-colors">Deploy</Link>
                        <Link href="/docs" className="block px-4 py-3 text-sm uppercase tracking-wider text-neutral-500 hover:bg-white hover:text-black transition-colors">Docs</Link>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t-2 border-white mt-auto">
              <div className="container-editorial py-8 md:py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                  {/* Brand */}
                  <div className="col-span-2 md:col-span-1">
                    <div className="font-editorial text-xl font-bold mb-4">CC0STRATEGY</div>
                    <p className="text-neutral-500 text-sm leading-relaxed mb-4">
                      Token launchpad where trading fees flow directly to NFT holders. 
                      Built on Uniswap V4.
                    </p>
                    {/* Social Icons */}
                    <div className="flex items-center gap-4">
                      <a href="https://x.com/cc0company" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity" title="X (Twitter)">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </a>
                      <a href="https://discord.gg/ZYVHpbmTAZ" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity" title="Discord">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                  
                  {/* Links */}
                  <div>
                    <div className="caption text-neutral-500 mb-4">Navigate</div>
                    <div className="space-y-2">
                      <Link href="/browse" className="block text-sm hover:opacity-60 transition-opacity">Browse Tokens</Link>
                      <Link href="/swap" className="block text-sm hover:opacity-60 transition-opacity">Trade</Link>
                      <Link href="/claim" className="block text-sm hover:opacity-60 transition-opacity">Claim Fees</Link>
                      <Link href="/portfolio" className="block text-sm hover:opacity-60 transition-opacity">Portfolio</Link>
                      <Link href="/deploy" className="block text-sm hover:opacity-60 transition-opacity">Deploy Token</Link>
                    </div>
                  </div>
                  
                  {/* Resources */}
                  <div>
                    <div className="caption text-neutral-500 mb-4">Resources</div>
                    <div className="space-y-2">
                      <Link href="/docs" className="block text-sm hover:opacity-60 transition-opacity">Documentation</Link>
                      <a href="https://github.com/cc0toshi/cc0strategy" target="_blank" className="block text-sm hover:opacity-60 transition-opacity">GitHub →</a>
                      <a href="https://basescan.org/address/0xDbbC0A64fFe2a23b4543b0731CF61ef0d5d4E265" target="_blank" className="block text-sm hover:opacity-60 transition-opacity">BaseScan →</a>
                      <a href="https://etherscan.io/address/0x1dc68bc05ecb132059fb45b281dbfa92b6fab610" target="_blank" className="block text-sm hover:opacity-60 transition-opacity">Etherscan →</a>
                      <a href="https://farcaster.xyz/miniapps/N7O9MvQ8wid_/cc0strategy" target="_blank" className="block text-sm hover:opacity-60 transition-opacity">Farcaster Mini App →</a>
                    </div>
                  </div>

                  {/* Community */}
                  <div>
                    <div className="caption text-neutral-500 mb-4">Community</div>
                    <div className="space-y-2">
                      <a href="https://x.com/cc0company" target="_blank" className="block text-sm hover:opacity-60 transition-opacity">X (Twitter) →</a>
                      <a href="https://discord.gg/ZYVHpbmTAZ" target="_blank" className="block text-sm hover:opacity-60 transition-opacity">Discord →</a>
                    </div>
                  </div>
                </div>
                
                {/* Bottom */}
                <div className="border-t border-neutral-800 mt-8 md:mt-12 pt-6 md:pt-8 text-center md:text-left">
                  <div className="caption text-neutral-600">
                    © 2026 CC0STRATEGY · Protocol built by <a href="https://x.com/cc0toshi_" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">cc0toshi</a>, autonomous ai mfer. Deployed by <a href="https://x.com/cc0company" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">cc0company</a>.
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
