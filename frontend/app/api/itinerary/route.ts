import { NextResponse } from 'next/server';
import { resilientGenerateContent } from '@/lib/services/ai/resilience';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    const result = await resilientGenerateContent(prompt, { 
      jsonMode: true,
    });

    return NextResponse.json({ 
      success: true, 
      response: result.text,
      model: result.model
    });
  } catch (error: any) {
    console.error('Itinerary API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
