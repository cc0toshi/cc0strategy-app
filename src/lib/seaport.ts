// Seaport Integration for cc0strategy Marketplace
import { createPublicClient, createWalletClient, http, encodeFunctionData, parseEther, formatEther, type Hex } from 'viem';
import { base, mainnet } from 'viem/chains';

// Seaport 1.6 contract address (same on all chains)
export const SEAPORT_ADDRESS = '0x0000000000000068F116a894984e2DB1123eB395' as const;
export const TREASURY = '0x58e510f849e38095375a3e478ad1d719650b8557' as const;
export const PLATFORM_FEE_BPS = 100; // 1%

// Item types
export enum ItemType {
  NATIVE = 0,
  ERC20 = 1,
  ERC721 = 2,
  ERC1155 = 3,
  ERC721_WITH_CRITERIA = 4,
  ERC1155_WITH_CRITERIA = 5,
}

// Order types
export enum OrderType {
  FULL_OPEN = 0,
  PARTIAL_OPEN = 1,
  FULL_RESTRICTED = 2,
  PARTIAL_RESTRICTED = 3,
}

export interface OfferItem {
  itemType: ItemType;
  token: Hex;
  identifierOrCriteria: bigint;
  startAmount: bigint;
  endAmount: bigint;
}

export interface ConsiderationItem {
  itemType: ItemType;
  token: Hex;
  identifierOrCriteria: bigint;
  startAmount: bigint;
  endAmount: bigint;
  recipient: Hex;
}

export interface OrderParameters {
  offerer: Hex;
  zone: Hex;
  offer: OfferItem[];
  consideration: ConsiderationItem[];
  orderType: OrderType;
  startTime: bigint;
  endTime: bigint;
  zoneHash: Hex;
  salt: bigint;
  conduitKey: Hex;
  totalOriginalConsiderationItems: bigint;
}

export interface Order {
  parameters: OrderParameters;
  signature: Hex;
}

// EIP-712 types for Seaport order signing
export const SEAPORT_DOMAIN = {
  name: 'Seaport',
  version: '1.6',
  verifyingContract: SEAPORT_ADDRESS,
};

export const ORDER_TYPES = {
  OrderComponents: [
    { name: 'offerer', type: 'address' },
    { name: 'zone', type: 'address' },
    { name: 'offer', type: 'OfferItem[]' },
    { name: 'consideration', type: 'ConsiderationItem[]' },
    { name: 'orderType', type: 'uint8' },
    { name: 'startTime', type: 'uint256' },
    { name: 'endTime', type: 'uint256' },
    { name: 'zoneHash', type: 'bytes32' },
    { name: 'salt', type: 'uint256' },
    { name: 'conduitKey', type: 'bytes32' },
    { name: 'counter', type: 'uint256' },
  ],
  OfferItem: [
    { name: 'itemType', type: 'uint8' },
    { name: 'token', type: 'address' },
    { name: 'identifierOrCriteria', type: 'uint256' },
    { name: 'startAmount', type: 'uint256' },
    { name: 'endAmount', type: 'uint256' },
  ],
  ConsiderationItem: [
    { name: 'itemType', type: 'uint8' },
    { name: 'token', type: 'address' },
    { name: 'identifierOrCriteria', type: 'uint256' },
    { name: 'startAmount', type: 'uint256' },
    { name: 'endAmount', type: 'uint256' },
    { name: 'recipient', type: 'address' },
  ],
};

// Generate random salt
export function generateSalt(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
}

// Calculate platform fee
export function calculatePlatformFee(priceWei: bigint): bigint {
  return (priceWei * BigInt(PLATFORM_FEE_BPS)) / 10000n;
}

// Create a fixed-price listing order parameters
export function createListingOrder(
  seller: Hex,
  nftContract: Hex,
  tokenId: bigint,
  priceEth: string,
  durationSeconds: number,
  chainId: number
): OrderParameters {
  const priceWei = parseEther(priceEth);
  const platformFee = calculatePlatformFee(priceWei);
  const sellerAmount = priceWei - platformFee;
  
  const now = BigInt(Math.floor(Date.now() / 1000));
  const endTime = now + BigInt(durationSeconds);

  return {
    offerer: seller,
    zone: '0x0000000000000000000000000000000000000000' as Hex,
    offer: [{
      itemType: ItemType.ERC721,
      token: nftContract,
      identifierOrCriteria: tokenId,
      startAmount: 1n,
      endAmount: 1n,
    }],
    consideration: [
      // Seller receives ETH minus platform fee
      {
        itemType: ItemType.NATIVE,
        token: '0x0000000000000000000000000000000000000000' as Hex,
        identifierOrCriteria: 0n,
        startAmount: sellerAmount,
        endAmount: sellerAmount,
        recipient: seller,
      },
      // Platform fee to treasury
      {
        itemType: ItemType.NATIVE,
        token: '0x0000000000000000000000000000000000000000' as Hex,
        identifierOrCriteria: 0n,
        startAmount: platformFee,
        endAmount: platformFee,
        recipient: TREASURY,
      },
    ],
    orderType: OrderType.FULL_OPEN,
    startTime: now,
    endTime,
    zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex,
    salt: generateSalt(),
    conduitKey: '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex,
    totalOriginalConsiderationItems: 2n,
  };
}

// Seaport ABI fragments we need
export const SEAPORT_ABI = [
  {
    name: 'fulfillBasicOrder_efficient_6GL6yc',
    type: 'function',
    inputs: [
      {
        name: 'parameters',
        type: 'tuple',
        components: [
          { name: 'considerationToken', type: 'address' },
          { name: 'considerationIdentifier', type: 'uint256' },
          { name: 'considerationAmount', type: 'uint256' },
          { name: 'offerer', type: 'address' },
          { name: 'zone', type: 'address' },
          { name: 'offerToken', type: 'address' },
          { name: 'offerIdentifier', type: 'uint256' },
          { name: 'offerAmount', type: 'uint256' },
          { name: 'basicOrderType', type: 'uint8' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'zoneHash', type: 'bytes32' },
          { name: 'salt', type: 'uint256' },
          { name: 'offererConduitKey', type: 'bytes32' },
          { name: 'fulfillerConduitKey', type: 'bytes32' },
          { name: 'totalOriginalAdditionalRecipients', type: 'uint256' },
          { name: 'additionalRecipients', type: 'tuple[]', components: [
            { name: 'amount', type: 'uint256' },
            { name: 'recipient', type: 'address' },
          ]},
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'fulfilled', type: 'bool' }],
    stateMutability: 'payable',
  },
  {
    name: 'cancel',
    type: 'function',
    inputs: [
      {
        name: 'orders',
        type: 'tuple[]',
        components: [
          { name: 'offerer', type: 'address' },
          { name: 'zone', type: 'address' },
          { name: 'offer', type: 'tuple[]', components: [
            { name: 'itemType', type: 'uint8' },
            { name: 'token', type: 'address' },
            { name: 'identifierOrCriteria', type: 'uint256' },
            { name: 'startAmount', type: 'uint256' },
            { name: 'endAmount', type: 'uint256' },
          ]},
          { name: 'consideration', type: 'tuple[]', components: [
            { name: 'itemType', type: 'uint8' },
            { name: 'token', type: 'address' },
            { name: 'identifierOrCriteria', type: 'uint256' },
            { name: 'startAmount', type: 'uint256' },
            { name: 'endAmount', type: 'uint256' },
            { name: 'recipient', type: 'address' },
          ]},
          { name: 'orderType', type: 'uint8' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'zoneHash', type: 'bytes32' },
          { name: 'salt', type: 'uint256' },
          { name: 'conduitKey', type: 'bytes32' },
          { name: 'counter', type: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'cancelled', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'getCounter',
    type: 'function',
    inputs: [{ name: 'offerer', type: 'address' }],
    outputs: [{ name: 'counter', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// ERC721 approval check ABI
export const ERC721_ABI = [
  {
    name: 'isApprovedForAll',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    name: 'setApprovalForAll',
    type: 'function',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'ownerOf',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
] as const;

// Helper to format wei to ETH display
export function formatWeiToEth(wei: string | bigint): string {
  const weiNum = typeof wei === 'string' ? BigInt(wei) : wei;
  return formatEther(weiNum);
}

// Helper to get total price including fees
export function getTotalPrice(priceWei: bigint): bigint {
  return priceWei + calculatePlatformFee(priceWei);
}

// Chain config for Seaport
export const SEAPORT_CHAINS = {
  base: {
    chainId: 8453,
    chain: base,
    rpcUrl: 'https://mainnet.base.org',
  },
  ethereum: {
    chainId: 1,
    chain: mainnet,
    rpcUrl: 'https://eth.llamarpc.com',
  },
} as const;

export type SeaportChain = keyof typeof SEAPORT_CHAINS;
