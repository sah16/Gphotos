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

  const THRESHOLD = 0.25; // Cosine similarity threshold (adjust as needed based on model)
  
  const hasClues = queryEmbedding && queryEmbedding.length > 0;
  const candidates = hasClues 
    ? scoredPhotos.filter(p => p.score >= THRESHOLD)
    : scoredPhotos.slice(0, 50); // fallback if no query

  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, 50).map(c => c.photo);
}
