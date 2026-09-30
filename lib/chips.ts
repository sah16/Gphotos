import { Photo } from './retrieval';

export type Chip = {
  label: string;
  matchCount: number;
};

export function getTopChips(candidatePool: Photo[], selectedChips: string[] = [], topN: number = 20): Chip[] {
  const poolSize = candidatePool.length;
  if (poolSize === 0) return [];

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

    const splitRatio = count / poolSize;
    const splitScore = 0.5 - Math.abs(0.5 - splitRatio);

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
