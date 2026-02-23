import { NextRequest, NextResponse } from 'next/server';

// Pinata API for IPFS uploads
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_UPLOAD_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

export async function POST(request: NextRequest) {
  try {
    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: 'Pinata not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create form data for Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);
    pinataFormData.append('pinataMetadata', JSON.stringify({
      name: file.name,
    }));

    const response = await fetch(PINATA_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: pinataFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinata error:', errorText);
      return NextResponse.json(
        { error: 'Failed to upload to IPFS' },
        { status: 500 }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      ipfsHash: result.IpfsHash,
      ipfsUrl: `ipfs://${result.IpfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
