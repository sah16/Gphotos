const fs = require('fs/promises');
const path = require('path');

const MANIFEST_PATH = path.join(process.cwd(), 'public', 'photos', 'manifest.json');
const TAGS_PATH = path.join(process.cwd(), 'data', 'tags.json');
const EMBEDDINGS_PATH = path.join(process.cwd(), 'data', 'embeddings.json');
const FINAL_OUTPUT_PATH = path.join(process.cwd(), 'data', 'photos.json');

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
}

async function main() {
  const manifestData = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const tagsMap = JSON.parse(await fs.readFile(TAGS_PATH, 'utf8'));
  const embeddingsMap = JSON.parse(await fs.readFile(EMBEDDINGS_PATH, 'utf8'));
  
  const dataset = [];
  
  const startDate = new Date(2018, 0, 1);
  const endDate = new Date(2023, 11, 31);
  
  for (const photo of manifestData) {
    const tagsInfo = tagsMap[photo.id];
    const embedInfo = embeddingsMap[photo.id];
    
    if (!tagsInfo || !embedInfo) {
      console.warn(`Missing tag or embed info for photo ${photo.id}. Skipping.`);
      continue;
    }
    
    dataset.push({
      id: photo.id,
      imageUrl: `/photos/${photo.filename}`,
      caption: tagsInfo.caption,
      tags: tagsInfo.tags,
      date: randomDate(startDate, endDate),
      isBestMatch: false,
      embedding: embedInfo.embedding
    });
  }
  
  await fs.writeFile(FINAL_OUTPUT_PATH, JSON.stringify(dataset, null, 2));
  console.log(`Successfully built final dataset with ${dataset.length} records.`);
  console.log(`Saved to ${FINAL_OUTPUT_PATH}`);
}

main().catch(console.error);
