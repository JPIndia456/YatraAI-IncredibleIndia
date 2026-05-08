import { NextResponse } from 'next/server';

/**
 * Price Verification API
 * 
 * In production, this would call the real MCP (IRCTC/Amadeus/OTA) to get
 * the live price just before payment. This prevents users from paying a
 * stale price shown on screen.
 * 
 * For now, we simulate real-world price volatility:
 *  - 70% of the time: price is unchanged
 *  - 20% of the time: price has increased (surge/demand)
 *  - 10% of the time: price decreased (deal/availability)
 */

function simulateLivePrice(basePrice: number, tier: string, transport: string): {
  livePrice: number;
  changed: boolean;
  reason?: string;
} {
  const r = Math.random();

  // Tier-based volatility — premium tiers fluctuate more
  const volatilityMap: Record<string, number> = {
    Brahmin: 0.12,  // up to ±12%
    Vaisya: 0.07,   // up to ±7%
    Kshatriya: 0.04, // up to ±4%
    Premium: 0.12,
    Medium: 0.07,
    Economy: 0.04,
  };
  const volatility = volatilityMap[tier] ?? 0.08;

  if (r < 0.70) {
    // Price unchanged 70% of the time
    return { livePrice: basePrice, changed: false };
  } else if (r < 0.90) {
    // Price increased — simulate surge reasons
    const surgeReasons = [
      'Demand surge detected — limited seats remain',
      'Dynamic fare adjustment by carrier',
      'Tatkal quota applied to remaining inventory',
      'Peak season premium applied',
    ];
    const increase = Math.floor(basePrice * (0.03 + Math.random() * volatility));
    return {
      livePrice: basePrice + increase,
      changed: true,
      reason: surgeReasons[Math.floor(Math.random() * surgeReasons.length)],
    };
  } else {
    // Price dropped — simulate deal reasons
    const dealReasons = [
      'Last-minute deal — unsold inventory released',
      'Carrier promotional discount applied',
      'Early checkout discount — hotel room freed',
    ];
    const decrease = Math.floor(basePrice * (0.02 + Math.random() * 0.05));
    return {
      livePrice: basePrice - decrease,
      changed: true,
      reason: dealReasons[Math.floor(Math.random() * dealReasons.length)],
    };
  }
}

export async function POST(req: Request) {
  try {
    const { displayedPrice, tier, transport, hotel, origin, destination } = await req.json();

    if (!displayedPrice || displayedPrice <= 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }

    // Simulate a real API latency (150–600ms)
    await new Promise(r => setTimeout(r, 150 + Math.random() * 450));

    const { livePrice, changed, reason } = simulateLivePrice(
      Number(displayedPrice),
      tier,
      transport
    );

    const priceDiff = livePrice - Number(displayedPrice);
    const priceDiffPercent = ((priceDiff / Number(displayedPrice)) * 100).toFixed(1);

    return NextResponse.json({
      success: true,
      displayedPrice: Number(displayedPrice),
      livePrice,
      changed,
      increased: priceDiff > 0,
      priceDiff: Math.abs(priceDiff),
      priceDiffPercent: Math.abs(Number(priceDiffPercent)),
      reason,
      verifiedAt: new Date().toISOString(),
      // In production: also return a signed price token that Razorpay
      // or your backend can validate to prevent client-side tampering
      priceToken: Buffer.from(
        JSON.stringify({ livePrice, ts: Date.now(), origin, destination })
      ).toString('base64'),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
