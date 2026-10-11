import { Photo } from './retrieval';

export type Chip = {
  label: string;
  matchCount: number;
};

export function getTopChips(candidatePool: Photo[], selectedChips: string[] = [], topN: number = 20, query: string = ''): Chip[] {
  const poolSize = candidatePool.length;
  if (poolSize === 0) return [];

  const queryTokens = new Set(
    (query.toLowerCase().match(/\b[a-z0-9]+\b/g) || []).filter(w => w.length > 2)
  );

  const tagCounts = new Map<string, number>();
  const tagOriginalCase = new Map<string, string>();

  for (const photo of candidatePool) {
    const seenTags = new Set<string>();
    for (const tag of photo.tags) {
      const cleanTag = tag.toLowerCase().trim();
      if (!seenTags.has(cleanTag)) {
        seenTags.add(cleanTag);
        tagCounts.set(cleanTag, (tagCounts.get(cleanTag) || 0) + 1);
        if (!tagOriginalCase.has(cleanTag)) {
            // Capitalize the first letter for display if it's original
            const displayTag = tag.charAt(0).toUpperCase() + tag.slice(1);
            tagOriginalCase.set(cleanTag, displayTag);
        }
      }
    }
  }

  const selectedSet = new Set(selectedChips.map(c => c.toLowerCase().trim()));
  const validChips: { label: string; count: number; splitScore: number }[] = [];

  for (const [tag, count] of tagCounts.entries()) {
    if (selectedSet.has(tag)) continue;
    if (count > poolSize * 0.95 || count <= 1) continue;

    // Filter out chips whose words are entirely already present in the user's query
    if (queryTokens.size > 0) {
      const payload = tag.includes(':') ? tag.split(':')[1].trim() : tag;
      const tagTokens = (payload.toLowerCase().match(/\b[a-z0-9]+\b/g) || []).filter(w => w.length > 2);
      if (tagTokens.length > 0 && tagTokens.every(t => queryTokens.has(t))) {
        continue;
      }
    }

    const splitRatio = count / poolSize;
    let splitScore = 0.5 - Math.abs(0.5 - splitRatio);

    // Boost Action and Object chips so they rank higher than generic scene-level descriptors
    if (tag.startsWith('action:') || tag.startsWith('object:')) {
      splitScore += 0.2; 
    }

    validChips.push({ label: tag, count, splitScore });
  }

  validChips.sort((a, b) => {
    if (Math.abs(b.splitScore - a.splitScore) > 0.01) {
      return b.splitScore - a.splitScore;
    }
    return b.count - a.count;
  });

  return validChips.slice(0, topN).map(c => ({
    label: tagOriginalCase.get(c.label) || c.label,
    matchCount: c.count
  }));
}
