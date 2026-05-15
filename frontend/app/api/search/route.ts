import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { destination, origin, startDate, endDate, adults, kids } = body;

    // Call individual live APIs in parallel for speed
    const [flightsRes, hotelsRes, trainsRes, busesRes] = await Promise.all([
      fetch(`${new URL(req.url).origin}/api/live/flights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: origin, to: destination, date: startDate, adults, kids })
      }).then(r => r.json()).catch(() => ({ flights: [] })),
      
      fetch(`${new URL(req.url).origin}/api/live/hotels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, checkIn: startDate, checkOut: endDate || startDate, adults, kids })
      }).then(r => r.json()).catch(() => ({ hotels: [] })),

      fetch(`${new URL(req.url).origin}/api/live/trains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, date: startDate })
      }).then(r => r.json()).catch(() => ({ trains: [] })),

      fetch(`${new URL(req.url).origin}/api/live/buses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, date: startDate })
      }).then(r => r.json()).catch(() => ({ buses: [] }))
    ]);

    return NextResponse.json({
      success: true,
      flights: flightsRes.flights || [],
      hotels: hotelsRes.hotels || [],
      trains: trainsRes.trains || [],
      buses: busesRes.buses || [],
      taxis: [],
      ferries: []
    });

  } catch (error: any) {
    console.error('Search Aggregator Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
