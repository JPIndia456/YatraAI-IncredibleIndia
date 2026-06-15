import { NextResponse } from 'next/server';
import { rateLimitOr429 } from '@/lib/security/apiRateLimit';

/**
 * Proxy for RapidAPI MCP (Model Context Protocol).
 * This allows the YatraAI frontend and AI Brain to call MCP tools via HTTP.
 */
export async function POST(req: Request) {
  try {
    const limited = rateLimitOr429(req, 'mcp-proxy', 30, 60_000);
    if (limited) return limited;

    const body = await req.json();
    const apiKey = process.env.BOOKING_RAPIDAPI_KEY;
    const apiHost = process.env.BOOKING_RAPIDAPI_HOST || 'booking-com15.p.rapidapi.com';

    if (!apiKey) {
      return NextResponse.json({ error: 'RapidAPI Key not configured' }, { status: 500 });
    }

    // RapidAPI MCP JSON-RPC Endpoint
    const mcpUrl = 'https://mcp.rapidapi.com';

    // Proxy the request to RapidAPI Hub
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-api-host': apiHost,
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: `RapidAPI MCP Error: ${response.status}`, 
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (err: unknown) {
    console.error('[MCP_PROXY_ERROR]:', err);
    const message = err instanceof Error ? err.message : 'MCP proxy request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET handler to list available tools from the MCP server.
 */
export async function GET(req: Request) {
  try {
    const limited = rateLimitOr429(req, 'mcp-proxy', 30, 60_000);
    if (limited) return limited;

    const apiKey = process.env.BOOKING_RAPIDAPI_KEY;
    const apiHost = process.env.BOOKING_RAPIDAPI_HOST || 'booking-com15.p.rapidapi.com';

    if (!apiKey) {
      return NextResponse.json({ error: 'RapidAPI Key not configured' }, { status: 500 });
    }

    // JSON-RPC list tools request
    const listToolsRequest = {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 1
    };

    const response = await fetch('https://mcp.rapidapi.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-api-host': apiHost,
      },
      body: JSON.stringify(listToolsRequest),
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'MCP tools listing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
