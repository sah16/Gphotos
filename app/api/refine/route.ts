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
    
    // 1. Recompute original candidate pool
    const candidatePool = retrievePhotos(queryTokens);
    
    // 2. Filter pool down (AND logic across chips)
    let filteredPool = candidatePool;
    if (selectedChips.length > 0) {
      const chipSet = new Set(selectedChips.map(c => c.toLowerCase().trim()));
      
      filteredPool = candidatePool.filter(photo => {
        const photoTagsSet = new Set(photo.tags.map(t => t.toLowerCase().trim()));
        // Photo must contain ALL selected chips
        for (const chip of chipSet) {
          if (!photoTagsSet.has(chip)) return false;
        }
        return true;
      });
    }

    // 3. Recompute chips from the filtered pool
    const topChips = getTopChips(filteredPool, selectedChips);

    // Take top 12 for the visible grid
    const visibleResults = filteredPool.slice(0, 12).map((p, index) => {
      // Create a copy to remove tagVector
      const { tagVector, ...safePhoto } = p;
      return {
        ...safePhoto,
        isBestMatch: index === 0,
      };
    });

    return NextResponse.json({
      results: visibleResults,
      chips: topChips,
      totalMatches: filteredPool.length
    });
  } catch (error) {
    console.error('Refine API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
