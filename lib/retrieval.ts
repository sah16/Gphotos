import photosData from '../data/photos.json';
import { cosineSimilarity } from './embeddings';

export type Photo = {
  id: string;
  imageUrl: string;
  caption: string;
  tags: string[];
  date: string;
  isBestMatch?: boolean;
  embedding?: number[];
};

export function scorePhoto(photo: Photo, queryEmbedding: number[]): number {
  if (!queryEmbedding || queryEmbedding.length === 0) return 0;
  if (!photo.embedding || photo.embedding.length === 0) return 0;
  
  return cosineSimilarity(photo.embedding, queryEmbedding);
}

export function retrievePhotos(queryEmbedding: number[]): Photo[] {
  const scoredPhotos = (photosData as Photo[]).map(photo => ({
    photo,
    score: scorePhoto(photo, queryEmbedding)
  }));

  const hasClues = queryEmbedding && queryEmbedding.length > 0;
  if (!hasClues) {
    return (photosData as Photo[]).slice(0, 50);
  }

  scoredPhotos.sort((a, b) => b.score - a.score);

  const topScore = scoredPhotos[0]?.score || 0;
  const ABSOLUTE_MIN = 0.50; // Safety floor for relevance
  if (topScore < ABSOLUTE_MIN) {
    return [];
  }

  // Adaptive cutoff: keep photos within 0.08 margin of the best match
  const MARGIN = 0.08;
  const cutoff = Math.max(ABSOLUTE_MIN, topScore - MARGIN);

  const candidates = scoredPhotos.filter(p => p.score >= cutoff);

  return candidates.slice(0, 50).map(c => c.photo);
}
