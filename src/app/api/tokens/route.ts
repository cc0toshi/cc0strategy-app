import { NextResponse } from 'next/server';

const INDEXER_API_URL = process.env.INDEXER_API_URL;

export async function GET(request: Request) {
  if (!INDEXER_API_URL) {
    return NextResponse.json(
      { error: 'INDEXER_API_URL not configured', tokens: [] },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const chain = searchParams.get('chain');

    // Build query string with optional chain filter
    let queryString = `limit=${limit}&offset=${offset}`;
    if (chain) {
      queryString += `&chain=${chain}`;
    }

    const response = await fetch(
      `${INDEXER_API_URL}/tokens?${queryString}`,
      {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    
    // Transform pool_id from bytea to hex string if needed
    if (data.tokens && Array.isArray(data.tokens)) {
      data.tokens = data.tokens.map((token: any) => ({
        ...token,
        pool_id: token.pool_id 
          ? (typeof token.pool_id === 'string' 
              ? token.pool_id 
              : `0x${Buffer.from(token.pool_id).toString('hex')}`)
          : null,
      }));
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching tokens:', error.message);
    return NextResponse.json(
      { error: error.message, tokens: [] },
      { status: 502 }
    );
  }
}
