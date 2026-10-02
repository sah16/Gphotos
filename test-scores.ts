import photosData from './data/photos.json';
import { scorePhoto } from './lib/retrieval';
import { getEmbedding } from './lib/embeddings';

async function main() {
  const query = "cafe image";
  const queryEmbedding = await getEmbedding(query);

  const scored = photosData.map((photo: any) => ({
    id: photo.id,
    caption: photo.caption,
    score: scorePhoto(photo as any, queryEmbedding)
  })).sort((a, b) => b.score - a.score);

  console.log("=== Top 5 scores ===");
  for (let i = 0; i < Math.min(5, scored.length); i++) {
    console.log(`[Score: ${scored[i].score.toFixed(4)}] ${scored[i].caption.substring(0, 60)}...`);
  }

  console.log("\n=== Bottom 5 scores (or irrelevant samples) ===");
  const lowest = scored.filter(s => s.score > 0).slice(-5);
  for (const s of lowest) {
    console.log(`[Score: ${s.score.toFixed(4)}] ${s.caption.substring(0, 60)}...`);
  }
}

main().catch(console.error);
