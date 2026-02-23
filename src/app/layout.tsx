import type { Metadata } from "next";
import { Space_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Link from "next/link";

const spaceMono = Space_Mono({ 
  weight: ['400', '700'],
  subsets: ["latin"],
  variable: '--font-space-mono',
});

const ibmPlex = IBM_Plex_Sans({ 
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-ibm-plex',
});

export const metadata: Metadata = {
  title: "CC0STRATEGY",
  description: "Token launchpad where trading fees go to NFT holders",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceMono.variable} ${ibmPlex.variable} font-body bg-black text-white min-h-screen flex flex-col`}>
        <Providers>
          {/* NAVIGATION */}
          <nav className="border-b-2 border-white">
            <div className="container-editorial">
              <div className="flex items-center justify-between h-20">
                {/* Logo */}
                <Link 
                  href="/" 
                  className="font-editorial text-2xl font-bold tracking-tight hover:opacity-60 transition-opacity"
                >
                  CC0STRATEGY
                </Link>
                
                {/* Navigation Links */}
                <div className="flex items-center gap-8">
                  <Link 
                    href="/browse" 
                    className="font-editorial text-sm uppercase tracking-widest hover:opacity-60 transition-opacity link-underline"
                  >
                    Browse
                  </Link>
                  <Link 
                    href="/swap" 
                    className="font-editorial text-sm uppercase tracking-widest hover:opacity-60 transition-opacity link-underline"
                  >
                    Swap
                  </Link>
                  <Link 
                    href="/claim" 
                    className="font-editorial text-sm uppercase tracking-widest hover:opacity-60 transition-opacity link-underline"
                  >
                    Claim
                  </Link>
                  <Link 
                    href="/deploy" 
                    className="font-editorial text-sm uppercase tracking-widest hover:opacity-60 transition-opacity link-underline"
                  >
                    Deploy
                  </Link>
                  <Link 
                    href="/docs" 
                    className="font-editorial text-sm uppercase tracking-widest text-neutral-500 hover:text-white transition-colors link-underline"
                  >
                    Docs
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* MAIN CONTENT */}
          <main className="flex-1">
            {children}
          </main>

          {/* FOOTER */}
          <footer className="border-t-2 border-white mt-auto">
            <div className="container-editorial py-12">
              <div className="grid md:grid-cols-3 gap-12">
                {/* Brand */}
                <div>
                  <div className="font-editorial text-xl font-bold mb-4">CC0STRATEGY</div>
                  <p className="text-neutral-500 text-sm leading-relaxed">
                    Token launchpad where trading fees flow directly to NFT holders. 
                    Built on Uniswap V4. 100% CC0.
                  </p>
                </div>
                
                {/* Links */}
                <div>
                  <div className="caption text-neutral-500 mb-4">Navigate</div>
                  <div className="space-y-2">
                    <Link href="/browse" className="block text-sm hover:opacity-60 transition-opacity">Browse Tokens</Link>
                    <Link href="/swap" className="block text-sm hover:opacity-60 transition-opacity">Swap</Link>
                    <Link href="/claim" className="block text-sm hover:opacity-60 transition-opacity">Claim Fees</Link>
                    <Link href="/deploy" className="block text-sm hover:opacity-60 transition-opacity">Deploy Token</Link>
                  </div>
                </div>
                
                {/* Resources */}
                <div>
                  <div className="caption text-neutral-500 mb-4">Resources</div>
                  <div className="space-y-2">
                    <Link href="/about" className="block text-sm hover:opacity-60 transition-opacity">About</Link>
                    <Link href="/docs" className="block text-sm hover:opacity-60 transition-opacity">Documentation</Link>
                    <a href="https://github.com/cc0toshi/cc0strategy" target="_blank" className="block text-sm hover:opacity-60 transition-opacity">GitHub →</a>
                    <a href="https://basescan.org/address/0x70b17db500Ce1746BB34f908140d0279C183f3eb" target="_blank" className="block text-sm hover:opacity-60 transition-opacity">BaseScan →</a>
                  </div>
                </div>
              </div>
              
              {/* Bottom bar */}
              <div className="border-t border-neutral-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-neutral-600 text-xs">
                  © 2024 CC0STRATEGY — PUBLIC DOMAIN
                </div>
                <div className="font-editorial text-xs tracking-widest text-neutral-600">
                  80% → NFT HOLDERS • 20% → TREASURY
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
