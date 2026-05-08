import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    // 1. Authenticate the Request using Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized User' }, { status: 401 });
    }

    // 2. Parse the incoming image file (FormData)
    const formData = await request.formData();
    const file = formData.get('ticketImage') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // const buffer = await file.arrayBuffer();
    // const base64Image = Buffer.from(buffer).toString('base64');

    // 3. (Architecture Placeholder) Implementation required
    // In production, fetch('https://vision.googleapis.com/...', { body: base64Image })
    
    // We return a 501 for now as the OCR pipeline is a pending feature
    return NextResponse.json({ error: 'Vision OCR not yet implemented in production.' }, { status: 501 });

    /* 
    // 4. Automatically persist this parsed booking into tourplan_bookings!
    // This logic is commented out until the OCR extractionResult is fully defined.
    const { data: newBooking, error: dbError } = await supabaseAdmin
      .from('tourplan_bookings')
      .insert({
        user_id: user.id,
        booking_type: 'TRAIN',
        pnr: 'EXTRACTION_REQUIRED',
        status: 'IMPORTED'
      })
      .select()
      .single();
    */

  } catch (error: any) {
    console.error('[Vision AI Error]', error.message);
    return NextResponse.json({ error: 'Failed to process ticket OCR' }, { status: 500 });
  }
}
