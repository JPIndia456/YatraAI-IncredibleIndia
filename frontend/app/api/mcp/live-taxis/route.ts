import { NextResponse } from 'next/server';
import { rateLimitOr429 } from '@/lib/security/apiRateLimit';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: Request) {
  try {
    const limited = rateLimitOr429(req, 'mcp-live-taxis', 30, 60_000);
    if (limited) return limited;

    const params = await req.json();
    const origin = params.origin || '';
    const dest = params.destination || '';

    // Simulate backend processing from sangvishtechnologies taxi-booking API
    await new Promise(resolve => setTimeout(resolve, 600));

    const taxis = [
      {
        id: "tax_1",
        driverName: "Rajesh K.",
        vehicle: "Toyota Innova Crysta",
        category: "SUV Premium",
        rating: 4.8,
        eta: "5 mins away",
        schedule: {
          duration: "3h 15m",
          distance: "148 km"
        },
        pricing: { amount: 2400, currency: "INR" }
      },
      {
        id: "tax_2",
        driverName: "Amit M.",
        vehicle: "Maruti Dzire",
        category: "Sedan Regular",
        rating: 4.5,
        eta: "12 mins away",
        schedule: {
          duration: "3h 30m",
          distance: "148 km"
        },
        pricing: { amount: 1600, currency: "INR" }
      },
      {
        id: "tax_3",
        driverName: "Sanjay P.",
        vehicle: "Honda City",
        category: "Sedan Premium",
        rating: 4.9,
        eta: "2 mins away",
        schedule: {
          duration: "3h 20m",
          distance: "148 km"
        },
        pricing: { amount: 1850, currency: "INR" }
      }
    ];

    return NextResponse.json({ success: true, data: taxis, origin, destination: dest });

  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err, 'Failed to fetch taxis') }, { status: 500 });
  }
}
