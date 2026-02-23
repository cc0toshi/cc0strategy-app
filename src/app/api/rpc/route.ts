import { NextRequest, NextResponse } from 'next/server';

// RPC methods we allow (whitelist for security)
const ALLOWED_METHODS = [
  'eth_call',
  'eth_getBalance',
  'eth_getBlockByNumber',
  'eth_getTransactionReceipt',
  'eth_getTransactionByHash',
  'eth_blockNumber',
  'eth_chainId',
  'eth_getLogs',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getCode',
  'eth_getStorageAt',
];

// Simple in-memory cache for read operations
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

function getCacheKey(method: string, params: any[]): string {
  return `${method}:${JSON.stringify(params)}`;
}

export async function POST(request: NextRequest) {
  const rpcUrl = process.env.BASE_RPC_URL;
  
  if (!rpcUrl) {
    return NextResponse.json(
      { error: 'RPC not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { method, params, id, jsonrpc } = body;

    // Validate method is allowed
    if (!ALLOWED_METHODS.includes(method)) {
      return NextResponse.json(
        { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not allowed' } },
        { status: 400 }
      );
    }

    // Check cache for read operations
    const cacheKey = getCacheKey(method, params || []);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: cached.data,
      });
    }

    // Forward to actual RPC
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: jsonrpc || '2.0',
        id: id || 1,
        method,
        params: params || [],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RPC error:', response.status, errorText);
      return NextResponse.json(
        { jsonrpc: '2.0', id, error: { code: -32000, message: `RPC error: ${response.status}` } },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Cache successful responses
    if (data.result !== undefined) {
      cache.set(cacheKey, { data: data.result, timestamp: Date.now() });
      
      // Clean old cache entries periodically
      if (cache.size > 1000) {
        const now = Date.now();
        for (const [key, value] of cache.entries()) {
          if (now - value.timestamp > CACHE_TTL * 2) {
            cache.delete(key);
          }
        }
      }
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('RPC proxy error:', error);
    return NextResponse.json(
      { jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'Internal proxy error' } },
      { status: 500 }
    );
  }
}
