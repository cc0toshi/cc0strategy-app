import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';

// Use NEXT_PUBLIC_BASE_RPC_URL if available, otherwise fall back to public RPC
const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(rpcUrl),
  },
});
