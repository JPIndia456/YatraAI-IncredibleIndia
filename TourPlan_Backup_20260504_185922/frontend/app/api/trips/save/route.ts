import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type TripInsertData = {
  user_id: string;
  origin: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  nights: number;
  tier_label: string;
  total_estimate: string;
  total_amount: number;
  transport: Record<string, unknown>;
  hotel: Record<string, unknown>;
  local_transport: Record<string, unknown>;
  full_plan: Record<string, unknown>;
  tier_comparison: unknown[];
  status: 'saved';
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      origin,
      destination,
      startDate,
      endDate,
      nights,
      tierLabel,
      total,
      totalNum,
      transport,
      hotel,
      local,
      fullPlan,
      tierComparison,
    } = body;

    if (!destination || !tierLabel || !total) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const insertData: TripInsertData = {
      user_id: user.id,
      origin: origin || '',
      destination,
      start_date: startDate || null,
      end_date: endDate || null,
      nights: nights || 1,
      tier_label: tierLabel,
      total_estimate: total,
      total_amount: totalNum || 0,
      transport: transport || {},
      hotel: hotel || {},
      local_transport: local || {},
      full_plan: fullPlan || {},
      tier_comparison: tierComparison || [],
      status: 'saved',
    };

    const { data, error } = await supabase
      .from('tourplan_trip_plans')
      .insert(insertData)
      .select('id, tier_label, total_estimate, created_at')
      .single();

    if (error) {
      console.error('[SaveTripPlan] Supabase error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      planId: data.id,
      message: `${tierLabel} plan saved to your TourPlan account!`,
      plan: data,
    });
  } catch (err: unknown) {
    console.error('[SaveTripPlan] Error:', err);
    return NextResponse.json({ success: false, error: errorMessage(err, 'Failed to save trip plan') }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('tourplan_trip_plans')
      .select('id, origin, destination, start_date, end_date, tier_label, total_estimate, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ success: true, plans: data || [] });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: errorMessage(err, 'Failed to fetch plans') }, { status: 500 });
  }
}

