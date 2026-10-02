const fs = require('fs/promises');
const path = require('path');
const { pipeline, env } = require('@xenova/transformers');

env.allowLocalModels = false;

const PHOTOS_DIR = path.join(process.cwd(), 'public', 'photos');
const MANIFEST_PATH = path.join(PHOTOS_DIR, 'manifest.json');
const TAGS_PATH = path.join(process.cwd(), 'data', 'tags.json');
const EMBEDS_PATH = path.join(process.cwd(), 'data', 'embeddings.json');

async function main() {
  await fs.mkdir(path.dirname(EMBEDS_PATH), { recursive: true });

  const manifestData = await fs.readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestData);

  const tagsData = await fs.readFile(TAGS_PATH, 'utf8');
  const allTags = JSON.parse(tagsData);

  let existingEmbeds = {};
  try {
    const existingData = await fs.readFile(EMBEDS_PATH, 'utf8');
    existingEmbeds = JSON.parse(existingData);
  } catch (e) {
    // fine if it doesn't exist
  }

  console.log(`Loading embedding model...`);
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  console.log(`Generating embeddings for ${manifest.length} photos...`);

  for (let i = 0; i < manifest.length; i++) {
    const photo = manifest[i];
    
    if (existingEmbeds[photo.id] && Array.isArray(existingEmbeds[photo.id].embedding) && existingEmbeds[photo.id].embedding.length > 0) {
      console.log(`[${i+1}/${manifest.length}] Skipping ${photo.id} (already embedded)`);
      continue;
    }

    const tagObj = allTags[photo.id];
    if (!tagObj) {
      console.log(`[${i+1}/${manifest.length}] Skipping ${photo.id} (no tags found)`);
      continue;
    }

    // Combine caption and tags into a descriptive sentence for semantic embedding
    const textToEmbed = `${tagObj.caption}. ${tagObj.tags.join(', ')}.`;
    console.log(`[${i+1}/${manifest.length}] Embedding ${photo.id}...`);

    const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
    
    existingEmbeds[photo.id] = {
      embedding: Array.from(output.data)
    };
  }

  await fs.writeFile(EMBEDS_PATH, JSON.stringify(existingEmbeds, null, 2));
  console.log(`Finished embedding! Saved to ${EMBEDS_PATH}`);
}

main().catch(console.error);
