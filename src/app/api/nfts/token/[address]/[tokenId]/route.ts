import { NextRequest, NextResponse } from 'next/server';
import { getNFTMetadata, getContractMetadata, getNFTSales, getBestImageUrl, getTraits } from '@/lib/alchemy';

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer-production-812c.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string; tokenId: string } }
) {
  try {
    const contractAddress = params.address.toLowerCase();
    const tokenId = params.tokenId;
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || 'base';

    // Fetch NFT data from Alchemy
    const [nft, contractMetadata, sales] = await Promise.all([
      getNFTMetadata(contractAddress, tokenId, chain),
      getContractMetadata(contractAddress, chain),
      getNFTSales(contractAddress, tokenId, chain, 10),
    ]);

    if (!nft) {
      return NextResponse.json({ error: 'NFT not found' }, { status: 404 });
    }

    // Fetch listing and offers from indexer
    let listing = null;
    let activity: any[] = [];
    let linkedToken = null;

    try {
      const [listingsRes, activityRes, tokenRes] = await Promise.all([
        fetch(`${INDEXER_URL}/marketplace/listings?collection=${contractAddress}&chain=${chain}`, { next: { revalidate: 30 } }),
        fetch(`${INDEXER_URL}/marketplace/activity?collection=${contractAddress}&tokenId=${tokenId}&chain=${chain}&limit=20`, { next: { revalidate: 60 } }),
        fetch(`${INDEXER_URL}/tokens?chain=${chain}`, { next: { revalidate: 300 } }),
      ]);

      if (listingsRes.ok) {
        const listingsData = await listingsRes.json();
        listing = (listingsData.listings || []).find((l: any) => l.token_id === tokenId) || null;
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        activity = activityData.activity || [];
      }

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        linkedToken = (tokenData.tokens || []).find(
          (t: any) => t.nft_collection?.toLowerCase() === contractAddress
        ) || null;
      }
    } catch (e) {
      console.error('Error fetching marketplace data:', e);
    }

    // Format response
    const response = {
      tokenId,
      name: nft.name || `#${tokenId}`,
      description: nft.description || null,
      image: getBestImageUrl(nft),
      traits: getTraits(nft),
      collection: {
        address: contractAddress,
        name: contractMetadata?.name || contractMetadata?.openSeaMetadata?.collectionName || 'Unknown',
        symbol: contractMetadata?.symbol || null,
        totalSupply: contractMetadata?.totalSupply ? parseInt(contractMetadata.totalSupply) : null,
        imageUrl: contractMetadata?.openSeaMetadata?.imageUrl || null,
      },
      listing: listing ? {
        orderHash: listing.order_hash,
        price: listing.price_wei,
        seller: listing.seller,
        endTime: listing.end_time,
        orderData: listing.order_data,
      } : null,
      linkedToken: linkedToken ? {
        address: linkedToken.address,
        symbol: linkedToken.symbol,
        name: linkedToken.name,
      } : null,
      history: [
        // Convert Alchemy sales to activity format
        ...sales.map(sale => ({
          eventType: 'sale',
          price: sale.sellerFee?.amount || '0',
          from: sale.sellerAddress,
          to: sale.buyerAddress,
          txHash: sale.transactionHash,
          timestamp: null, // Alchemy doesn't provide timestamp directly
        })),
        // Add indexer activity
        ...activity.map((a: any) => ({
          eventType: a.event_type,
          price: a.price_wei,
          from: a.from_address,
          to: a.to_address,
          txHash: a.tx_hash,
          timestamp: a.timestamp,
        })),
      ],
      chain,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('NFT API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFT data' },
      { status: 500 }
    );
  }
}
