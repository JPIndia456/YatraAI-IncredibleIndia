import { NextResponse } from 'next/server';

function isAuthorized(req: Request) {
  if (process.env.NODE_ENV !== 'production') return true;
  const secret = process.env.SYS_DEBUG_SECRET;
  if (!secret) return false;
  return req.headers.get('x-sys-debug-secret') === secret;
}

function isConfigured(value: string | undefined) {
  return Boolean(value && !value.startsWith('REPLACE_') && !value.startsWith('YOUR_'));
}

function keyPreview(value: string | undefined) {
  if (!value) return null;
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const providers = {
    flights: {
      googleFlightsRapidApi: {
        enabled:
          isConfigured(process.env.GOOGLE_FLIGHTS_RAPIDAPI_KEY) &&
          isConfigured(process.env.GOOGLE_FLIGHTS_RAPIDAPI_HOST),
        host: process.env.GOOGLE_FLIGHTS_RAPIDAPI_HOST || null,
      },
      aviationEdge: {
        enabled: isConfigured(process.env.AVIATION_EDGE_API_KEY),
      },
      bookingRapidApi: {
        enabled:
          isConfigured(process.env.BOOKING_RAPIDAPI_KEY) &&
          isConfigured(process.env.BOOKING_RAPIDAPI_HOST),
        host: process.env.BOOKING_RAPIDAPI_HOST || null,
      },
      geminiFallback: {
        enabled: isConfigured(process.env.GEMINI_API_KEY),
      },
    },
    hotels: {
      bookingRapidApi: {
        enabled:
          isConfigured(process.env.BOOKING_RAPIDAPI_KEY) &&
          isConfigured(process.env.BOOKING_RAPIDAPI_HOST),
        host: process.env.BOOKING_RAPIDAPI_HOST || null,
      },
      tripadvisorRapidApi: {
        enabled:
          isConfigured(process.env.TRIPADVISOR_RAPIDAPI_KEY) &&
          isConfigured(process.env.TRIPADVISOR_RAPIDAPI_HOST),
        host: process.env.TRIPADVISOR_RAPIDAPI_HOST || null,
      },
      geminiFallback: {
        enabled: isConfigured(process.env.GEMINI_API_KEY),
      },
    },
    mcp: {
      liveHotelsRoutePresent: true,
      note: 'Planner currently calls /api/live/hotels and /api/live/flights.',
    },
  };

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    providers,
  });
}

