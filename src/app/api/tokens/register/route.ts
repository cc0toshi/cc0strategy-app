import { NextRequest, NextResponse } from 'next/server';

const INDEXER_API_URL = process.env.INDEXER_API_URL;

/**
 * POST /api/tokens/register - Register a newly deployed token
 */
export async function POST(request: NextRequest) {
  if (!INDEXER_API_URL) {
    return NextResponse.json(
      { error: 'INDEXER_API_URL not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    
    const {
      address,
      name,
      symbol,
      nftCollection,
      deployer,
      deployTxHash,
      deployBlock,
      imageUrl,
      description,
      poolId,
      chain = 'base',
    } = body;

    // Validate required fields
    if (!address || !name || !symbol || !nftCollection || !deployer || !deployTxHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Forward to indexer
    const response = await fetch(`${INDEXER_API_URL}/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: address.toLowerCase(),
        name,
        symbol,
        decimals: 18,
        nft_collection: nftCollection.toLowerCase(),
        deployer: deployer.toLowerCase(),
        deploy_tx_hash: deployTxHash,
        deploy_block: deployBlock || 0,
        deployed_at: new Date().toISOString(),
        image_url: imageUrl,
        description,
        pool_id: poolId,
        chain,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to register token');
    }

    const result = await response.json();
    return NextResponse.json({ success: true, token: result });

  } catch (error: any) {
    console.error('Token registration error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
