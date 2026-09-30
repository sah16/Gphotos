import { NextResponse } from 'next/server';
import { retrievePhotos } from '@/lib/retrieval';
import { getTopChips } from '@/lib/chips';
import { normalizeQuery } from '@/lib/groq';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, selectedChips } = body;
    
    if (typeof query !== 'string' || !Array.isArray(selectedChips)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const queryTokens = await normalizeQuery(query);
    const candidatePool = retrievePhotos(queryTokens, selectedChips);
    const topChips = getTopChips(candidatePool, selectedChips);

    // Take top 12 for the visible grid
    const visibleResults = candidatePool.slice(0, 12).map((p, index) => {
      // Create a copy to remove tagVector
      const { tagVector, ...safePhoto } = p;
      return {
        ...safePhoto,
        isBestMatch: index === 0,
      };
    });

    return NextResponse.json({
      results: visibleResults,
      chips: topChips
    });
  } catch (error) {
    console.error('Refine API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
