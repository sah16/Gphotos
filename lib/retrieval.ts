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

export function scorePhoto(photo: Photo, queryTokens: string[]): number {
  let score = 0;
  
  if (queryTokens.length === 0) return 0;

  const photoVectorSet = new Set(photo.tagVector || []);
  const photoTags = photo.tags.map(t => t.toLowerCase());
  const caption = photo.caption.toLowerCase();

  for (const token of queryTokens) {
    let tokenScore = 0;
    
    // Exact tag match (very strong signal)
    if (photoTags.some(t => t === token || t.includes(token))) {
       tokenScore += 5;
    } 
    // Exact word match in caption (strong signal)
    else if (caption.match(new RegExp(`\\b${token}\\b`))) {
       tokenScore += 3;
    }
    // Tag vector (TF-IDF/keyword overlap) exact match
    else if (photoVectorSet.has(token)) {
      tokenScore += 2;
    } 
    // Partial substring match in tag vector (weakest signal)
    else {
      for (const v of photoVectorSet) {
        if (v.includes(token) || token.includes(v)) {
           tokenScore += 0.5;
           break;
        }
      }
    }
    
    score += tokenScore;
  }

  return score;
}

export function retrievePhotos(queryTokens: string[]): Photo[] {
  const scoredPhotos = (photosData as Photo[]).map(photo => ({
    photo,
    score: scorePhoto(photo, queryTokens)
  }));

  const THRESHOLD = 3; // Strict relevance threshold
  
  const hasClues = queryTokens.length > 0;
  const candidates = hasClues 
    ? scoredPhotos.filter(p => p.score >= THRESHOLD)
    : scoredPhotos.slice(0, 50); // fallback if no query

  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, 50).map(c => c.photo);
}
