import { NextResponse } from 'next/server';
import { getIntelligenceReport } from "@/lib/services/ai/intelligence";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Travel Intelligence Suggestion Route
 * Fetches structured data from Gemini or high-quality curated fallbacks.
 */
export async function POST(req: Request) {
  try {
    const { category, stateLocation, language } = await req.json();
    
    try {
      const data = await getIntelligenceReport(category, stateLocation, language);
      return NextResponse.json({ success: true, data });
    } catch (innerError: unknown) {
      console.error('[INTELLIGENCE_REPORT_CRASH]:', innerError);
      return NextResponse.json({ 
        success: false, 
        error: errorMessage(innerError, 'Internal Intelligence Failure'),
        fallback: true 
      });
    }
  } catch (error: unknown) {
    console.error('[SUGGEST_API_GLOBAL_ERROR]:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Global suggestion failure' 
    }, { status: 200 }); // Return 200 to prevent Next.js from showing HTML error page
  }
}
