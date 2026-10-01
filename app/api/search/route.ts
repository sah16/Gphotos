import { NextResponse } from 'next/server';
import { retrievePhotos } from '@/lib/retrieval';
import { getTopChips } from '@/lib/chips';
import { normalizeQuery } from '@/lib/groq';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;
    
    if (typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required and must be a string' }, { status: 400 });
    }

    const queryTokens = await normalizeQuery(query);
    const candidatePool = retrievePhotos(queryTokens);
    const topChips = getTopChips(candidatePool, []);

    // Take top 12 for the visible grid as requested in typical scenarios
    const visibleResults = candidatePool.slice(0, 12).map((p, index) => {
      // Create a copy to remove tagVector
      const { tagVector, ...safePhoto } = p;
      return {
        ...safePhoto,
        isBestMatch: index === 0 && query.trim().length > 0,
      };
    });

    return NextResponse.json({
      results: visibleResults,
      chips: topChips,
      totalMatches: candidatePool.length
    });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
