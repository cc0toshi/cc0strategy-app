import { NextRequest, NextResponse } from 'next/server';
import { getNFTsForCollection, getContractMetadata, getFloorPrice, getBestImageUrl, getTraits } from '@/lib/alchemy';

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer-production-812c.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const contractAddress = params.address.toLowerCase();
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || 'base';
    const pageKey = searchParams.get('pageKey') || undefined;
    const pageSize = parseInt(searchParams.get('limit') || '50');

    // Fetch NFTs from Alchemy
    const [nftsResult, contractMetadata, floorData] = await Promise.all([
      getNFTsForCollection(contractAddress, chain, { pageSize, pageKey, withMetadata: true }),
      getContractMetadata(contractAddress, chain),
      getFloorPrice(contractAddress, chain),
    ]);

    // Fetch active listings from indexer
    let listings: Record<string, any> = {};
    try {
      const listingsRes = await fetch(
        `${INDEXER_URL}/marketplace/listings?collection=${contractAddress}&chain=${chain}`,
        { next: { revalidate: 30 } }
      );
      if (listingsRes.ok) {
        const listingsData = await listingsRes.json();
        for (const listing of listingsData.listings || []) {
          listings[listing.token_id] = listing;
        }
      }
    } catch (e) {
      console.error('Error fetching listings:', e);
    }

    // Format NFTs
    const nfts = nftsResult.nfts.map(nft => {
      const tokenId = nft.tokenId;
      const listing = listings[tokenId];
      
      return {
        tokenId,
        name: nft.name || `#${tokenId}`,
        description: nft.description || null,
        image: getBestImageUrl(nft),
        traits: getTraits(nft),
        listing: listing ? {
          orderHash: listing.order_hash,
          price: listing.price_wei,
          seller: listing.seller,
          endTime: listing.end_time,
        } : null,
      };
    });

    // Build collection info
    const collection = {
      address: contractAddress,
      chain,
      name: contractMetadata?.name || contractMetadata?.openSeaMetadata?.collectionName || 'Unknown Collection',
      symbol: contractMetadata?.symbol || null,
      totalSupply: contractMetadata?.totalSupply ? parseInt(contractMetadata.totalSupply) : null,
      description: contractMetadata?.openSeaMetadata?.description || null,
      imageUrl: contractMetadata?.openSeaMetadata?.imageUrl || null,
      bannerUrl: contractMetadata?.openSeaMetadata?.bannerImageUrl || null,
      externalUrl: contractMetadata?.openSeaMetadata?.externalUrl || null,
      twitterUsername: contractMetadata?.openSeaMetadata?.twitterUsername || null,
      discordUrl: contractMetadata?.openSeaMetadata?.discordUrl || null,
      floorPrice: floorData?.openSea?.floorPrice || null,
      listedCount: Object.keys(listings).length,
    };

    return NextResponse.json({
      collection,
      nfts,
      pagination: {
        pageKey: nftsResult.pageKey || null,
        totalCount: nftsResult.totalCount,
        hasMore: !!nftsResult.pageKey,
      },
    });
  } catch (error) {
    console.error('Collection API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection data' },
      { status: 500 }
    );
  }
}
