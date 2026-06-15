import { NextResponse } from 'next/server';
import { rateLimitOr429 } from '@/lib/security/apiRateLimit';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: Request) {
  try {
    const limited = rateLimitOr429(req, 'mcp-live-hotels', 30, 60_000);
    if (limited) return limited;

    const params = await req.json();
    const destination = params.destination || 'Selected Destination';

    // Simulate backend processing from quickstay-hotel-booking system
    await new Promise(resolve => setTimeout(resolve, 1000));

    const hotels = [
      {
        id: "hst_1",
        hotelName: "Taj Mahal Palace",
        location: `${destination} City Center`,
        rating: "5.0",
        reviews: 4238,
        amenities: ["Sea View", "Pool", "Spa", "Lounge", "Free WiFi"],
        roomType: "Luxury Suite",
        availability: "Few Rooms Left",
        pricing: { amount: 28500, currency: "INR" }
      },
      {
        id: "hst_2",
        hotelName: "ITC Grand Central",
        location: `${destination} Corporate Hub`,
        rating: "4.8",
        reviews: 3105,
        amenities: ["Fitness Center", "Pool", "Workspace", "Breakfast Buffet"],
        roomType: "Executive Club",
        availability: "Available",
        pricing: { amount: 15400, currency: "INR" }
      },
      {
        id: "hst_3",
        hotelName: "Trident Hotel",
        location: `${destination} Airport Zone`,
        rating: "4.7",
        reviews: 2980,
        amenities: ["Airport Shuttle", "Pool", "24/7 Dining"],
        roomType: "Deluxe Double",
        availability: "Available",
        pricing: { amount: 11200, currency: "INR" }
      }
    ];

    return NextResponse.json({ success: true, data: hotels, location: destination });

  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err, 'Failed to fetch hotels') }, { status: 500 });
  }
}
