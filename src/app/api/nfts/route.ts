import { NextRequest, NextResponse } from 'next/server';

interface OpenSeaNFT {
  identifier: string;
  collection: string;
  contract: string;
  image_url?: string;
  display_image_url?: string;
}

interface OpenSeaResponse {
  nfts: OpenSeaNFT[];
  next: string | null;
}

/**
 * API route to fetch NFTs owned by an address via OpenSea
 * Keeps the API key server-side
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const collection = searchParams.get('collection');
  const includeImages = searchParams.get('includeImages') === 'true';
  
  if (!address) {
    return NextResponse.json(
      { error: 'Address parameter required' },
      { status: 400 }
    );
  }
  
  const apiKey = process.env.OPENSEA_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenSea API not configured' },
      { status: 503 }
    );
  }
  
  try {
    const tokenIds: string[] = [];
    const images: Record<string, string> = {};
    let nextCursor: string | null = null;
    
    do {
      // Build URL with pagination
      let url = `https://api.opensea.io/api/v2/chain/base/account/${address}/nfts`;
      const params = new URLSearchParams();
      
      if (nextCursor) {
        params.set('next', nextCursor);
      }
      params.set('limit', '200');
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return NextResponse.json(
            { error: 'Invalid OpenSea API key' },
            { status: 503 }
          );
        }
        if (response.status === 429) {
          return NextResponse.json(
            { error: 'Rate limited, please try again' },
            { status: 429 }
          );
        }
        throw new Error(`OpenSea API error: ${response.status}`);
      }
      
      const data: OpenSeaResponse = await response.json();
      
      // Process NFTs, filter by collection if specified
      for (const nft of data.nfts) {
        if (collection) {
          if (nft.contract.toLowerCase() !== collection.toLowerCase()) {
            continue;
          }
        }
        tokenIds.push(nft.identifier);
        
        // Capture image URL if requested
        if (includeImages) {
          const imageUrl = nft.display_image_url || nft.image_url;
          if (imageUrl) {
            images[nft.identifier] = imageUrl;
          }
        }
      }
      
      nextCursor = data.next;
    } while (nextCursor);
    
    const result: { tokenIds: string[]; images?: Record<string, string> } = { tokenIds };
    if (includeImages) {
      result.images = images;
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('OpenSea API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFTs from OpenSea' },
      { status: 500 }
    );
  }
}
