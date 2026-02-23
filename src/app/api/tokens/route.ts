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

    const response = await fetch(
      `${INDEXER_API_URL}/tokens?limit=${limit}&offset=${offset}`,
      {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching tokens:', error.message);
    return NextResponse.json(
      { error: error.message, tokens: [] },
      { status: 502 }
    );
  }
}
