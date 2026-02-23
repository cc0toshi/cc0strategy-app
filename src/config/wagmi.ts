import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';

// Use Alchemy RPC
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const rpcUrl = alchemyKey 
  ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : 'https://mainnet.base.org';

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(rpcUrl),
  },
});
