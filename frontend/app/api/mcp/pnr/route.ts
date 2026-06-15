import { NextResponse } from 'next/server';
import { getPnrStatus } from '@/indian-railways-mcp/src/railwayService';
import { rateLimitOr429 } from '@/lib/security/apiRateLimit';

type PnrResponse = { success?: boolean } & Record<string, unknown>;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: Request) {
  try {
    const limited = rateLimitOr429(req, 'mcp-pnr', 15, 60_000);
    if (limited) return limited;

    const { pnr } = await req.json();

    if (!pnr || !/^\d{10}$/.test(pnr)) {
      return NextResponse.json({ success: false, error: 'Invalid 10-digit PNR' }, { status: 400 });
    }

    const result = await getPnrStatus(pnr);
    
    const pnrResult = result as PnrResponse | null;
    if (pnrResult && pnrResult.success) {
      return NextResponse.json({ success: true, data: result });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'PNR not found or provider unavailable.',
          hint: 'Use a real booked 10-digit PNR to validate live status.',
        },
        { status: 502 }
      );
    }

  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: errorMessage(err, 'Failed to fetch PNR status') }, { status: 500 });
  }
}
