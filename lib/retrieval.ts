import photosData from '../data/photos.json';

export type Photo = {
  id: string;
  imageUrl: string;
  caption: string;
  tags: string[];
  date: string;
  isBestMatch?: boolean;
  tagVector?: string[];
};

export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
}

export function scorePhoto(photo: Photo, queryTokens: string[], selectedChips: string[] = []): number {
  let score = 0;
  
  if (queryTokens.length === 0 && selectedChips.length === 0) return 1;

  const photoVector = photo.tagVector || [];
  const photoVectorSet = new Set(photoVector);
  const photoTags = photo.tags.map(t => t.toLowerCase());
  const photoTagsSet = new Set(photoTags);

  for (const token of queryTokens) {
    if (photoVectorSet.has(token)) {
      score += 1;
    } else {
      for (const v of photoVector) {
        if (v.includes(token) || token.includes(v)) {
           score += 0.5;
           break;
        }
      }
    }
    
    if (photoTags.some(t => t.includes(token))) {
       score += 1;
    }
  }

  for (const chip of selectedChips) {
      const chipLower = chip.toLowerCase();
      if (photoTagsSet.has(chipLower)) {
          score += 5; 
      } else {
          const chipTokens = tokenize(chipLower);
          for(const ct of chipTokens) {
              if (photoVectorSet.has(ct)) score += 1;
              if (photoTags.some(t => t.includes(ct))) score += 1;
          }
      }
  }

  return score;
}

export function retrievePhotos(queryTokens: string[], selectedChips: string[] = []): Photo[] {
  const scoredPhotos = (photosData as Photo[]).map(photo => ({
    photo,
    score: scorePhoto(photo, queryTokens, selectedChips)
  }));

  const hasClues = queryTokens.length > 0 || selectedChips.length > 0;
  const candidates = hasClues 
    ? scoredPhotos.filter(p => p.score > 0)
    : scoredPhotos;

  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, 50).map(c => c.photo);
}
