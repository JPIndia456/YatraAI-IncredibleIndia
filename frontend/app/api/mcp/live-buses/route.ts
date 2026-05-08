import { NextResponse } from 'next/server';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: Request) {
  try {
    const params = await req.json();
    const origin = params.origin || '';
    const dest = params.destination || '';

    // Simulate backend processing from arunprakashxavier/bus-booking-app Java Spring Boot
    await new Promise(resolve => setTimeout(resolve, 800));

    const buses: unknown[] = [];

    return NextResponse.json({ success: true, data: buses, origin, destination: dest });

  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err, 'Failed to fetch buses') }, { status: 500 });
  }
}
