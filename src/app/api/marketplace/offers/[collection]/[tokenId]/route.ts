import { NextRequest, NextResponse } from 'next/server';

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer-production-812c.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { collection: string; tokenId: string } }
) {
  try {
    const collection = params.collection.toLowerCase();
    const tokenId = params.tokenId;
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || 'ethereum';

    // Fetch from both our indexer and OpenSea (via indexer proxy) in parallel
    // The OpenSea endpoint now returns BOTH item-specific AND collection-wide offers
    const [indexerOffers, openSeaOffers] = await Promise.all([
      fetchIndexerOffers(collection, tokenId, chain),
      fetchOpenSeaOffersViaIndexer(collection, tokenId, chain),
    ]);

    // Merge offers: use order_hash as key to dedupe
    const offersMap = new Map<string, any>();

    // Add our indexer offers first
    for (const offer of indexerOffers) {
      offersMap.set(offer.order_hash, {
        id: offer.id || offer.order_hash,
        order_hash: offer.order_hash,
        offerer: offer.offerer,
        amount_wei: offer.amount_wei,
        end_time: offer.end_time,
        order_data: offer.order_data,
        signature: offer.signature,
        status: offer.status,
        created_at: offer.created_at,
        source: 'indexer',
        is_collection_offer: false,
      });
    }

    // Add OpenSea offers (may override indexer)
    // Now includes both item-specific AND collection-wide offers
    for (const osOffer of openSeaOffers) {
      const converted = {
        id: osOffer.orderHash,
        order_hash: osOffer.orderHash,
        offerer: osOffer.offerer,
        amount_wei: osOffer.price,
        end_time: osOffer.expiration ? new Date(osOffer.expiration * 1000).toISOString() : null,
        order_data: osOffer.orderData || null,
        signature: osOffer.signature || '',
        status: 'active',
        created_at: new Date().toISOString(),
        source: 'opensea',
        is_collection_offer: osOffer.isCollectionOffer || false,
        protocol_address: osOffer.protocolAddress || null,
      };
      offersMap.set(osOffer.orderHash, converted);
    }

    // Convert to array and filter to only active, non-expired offers
    const now = Date.now();
    const offers = Array.from(offersMap.values())
      .filter(o => {
        if (o.status !== 'active') return false;
        if (!o.end_time) return true;
        const endTime = new Date(o.end_time).getTime();
        return endTime > now;
      })
      // Sort by amount descending (highest first)
      .sort((a, b) => {
        const diff = BigInt(b.amount_wei) - BigInt(a.amount_wei);
        return diff > 0n ? 1 : diff < 0n ? -1 : 0;
      });

    // Stats
    const itemOffers = offers.filter(o => !o.is_collection_offer);
    const collectionOffers = offers.filter(o => o.is_collection_offer);

    return NextResponse.json({ 
      offers,
      itemOffersCount: itemOffers.length,
      collectionOffersCount: collectionOffers.length,
      bestOffer: offers.length > 0 ? offers[0] : null,
    });
  } catch (error) {
    console.error('Offers API error:', error);
    return NextResponse.json({ offers: [] });
  }
}

async function fetchIndexerOffers(collection: string, tokenId: string, chain: string): Promise<any[]> {
  try {
    const res = await fetch(
      `${INDEXER_URL}/marketplace/offers?collection=${collection}&tokenId=${tokenId}&chain=${chain}`,
      { next: { revalidate: 30 } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.offers || [];
    }
  } catch (e) {
    console.error('Indexer offers error:', e);
  }
  return [];
}

async function fetchOpenSeaOffersViaIndexer(collection: string, tokenId: string, chain: string): Promise<any[]> {
  try {
    // This endpoint now returns BOTH item-specific AND collection-wide offers
    const res = await fetch(
      `${INDEXER_URL}/marketplace/opensea/offers/${collection}/${tokenId}?chain=${chain}&limit=50`,
      { next: { revalidate: 30 } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.offers || [];
    }
  } catch (e) {
    console.error('OpenSea offers via indexer error:', e);
  }
  return [];
}
