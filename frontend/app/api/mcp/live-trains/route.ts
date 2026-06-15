import { NextResponse } from 'next/server';
import { getTrainsBetweenStations } from '@/indian-railways-mcp/src/railwayService';
import { rateLimitOr429 } from '@/lib/security/apiRateLimit';

type RailwayResponse = { success?: boolean } & Record<string, unknown>;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: Request) {
  try {
    const limited = rateLimitOr429(req, 'mcp-live-trains', 30, 60_000);
    if (limited) return limited;

    const { fromStation, toStation } = await req.json();

    if (!fromStation || !toStation) {
      return NextResponse.json({ error: 'Missing required station codes.' }, { status: 400 });
    }

    // Default to a common high-volume route (BCT = Mumbai Central, NDLS = New Delhi) if plain words are provided
    const sourceCode = fromStation.toUpperCase() === 'MUMBAI' ? 'BCT' : fromStation;
    const destCode = toStation.toUpperCase() === 'DELHI' ? 'NDLS' : toStation;

    const data = await getTrainsBetweenStations(sourceCode, destCode);
    
    const railwayData = data as RailwayResponse | null;
    if (!railwayData || !railwayData.success) {
       return NextResponse.json({ error: 'Failed to fetch Real-Time Indian Railways Data.', details: data }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...(railwayData as Record<string, unknown>) });

  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error, 'Failed to fetch trains') }, { status: 500 });
  }
}
