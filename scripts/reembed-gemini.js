const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const MANIFEST_PATH = path.join(process.cwd(), 'public', 'photos', 'manifest.json');
const TAGS_PATH = path.join(process.cwd(), 'data', 'tags.json');
const EMBEDS_PATH = path.join(process.cwd(), 'data', 'embeddings.json');
const PHOTOS_PATH = path.join(process.cwd(), 'data', 'photos.json');

const EMBEDS_BACKUP = path.join(process.cwd(), 'data', 'embeddings.minilm.backup.json');
const PHOTOS_BACKUP = path.join(process.cwd(), 'data', 'photos.minilm.backup.json');

async function backupFiles() {
  try {
    const embedsData = await fs.readFile(EMBEDS_PATH, 'utf8');
    await fs.writeFile(EMBEDS_BACKUP, embedsData);
    console.log(`Backed up embeddings to ${EMBEDS_BACKUP}`);
  } catch (e) {}

  try {
    const photosData = await fs.readFile(PHOTOS_PATH, 'utf8');
    await fs.writeFile(PHOTOS_BACKUP, photosData);
    console.log(`Backed up photos to ${PHOTOS_BACKUP}`);
  } catch (e) {}
}

async function getGeminiBatchEmbeddings(texts, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;
  const requests = texts.map(t => ({
    model: 'models/gemini-embedding-001',
    content: {
      parts: [{ text: t }]
    },
    outputDimensionality: 768
  }));

  let retries = 5;
  while (retries > 0) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });

    if (res.status === 429) {
      console.log('Hit rate limit (100 req/min). Pausing 25 seconds before retrying...');
      await new Promise(r => setTimeout(r, 25000));
      retries--;
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (!data.embeddings || !Array.isArray(data.embeddings)) {
      throw new Error(`Invalid Gemini API response: ${JSON.stringify(data)}`);
    }

    return data.embeddings.map(e => e.values);
  }

  throw new Error('Exceeded max retries for rate limit.');
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY is not defined in .env.local');
    process.exit(1);
  }

  console.log('1. Checking backups...');
  await backupFiles();

  console.log('2. Loading photo manifest and tags...');
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const tagsMap = JSON.parse(await fs.readFile(TAGS_PATH, 'utf8'));

  // Load any already completed embeddings from current progress
  let newEmbeddings = {};
  try {
    const currentData = JSON.parse(await fs.readFile(EMBEDS_PATH, 'utf8'));
    // If it has 768 dim, keep it
    for (const [id, val] of Object.entries(currentData)) {
      if (val.embedding && val.embedding.length === 768) {
        newEmbeddings[id] = val;
      }
    }
  } catch (e) {}

  const itemsToEmbed = [];
  for (const photo of manifest) {
    const tagObj = tagsMap[photo.id];
    if (tagObj) {
      if (newEmbeddings[photo.id]) {
        continue; // Already embedded with 768 dim
      }
      const text = `${tagObj.caption}. ${tagObj.tags.join(', ')}.`;
      itemsToEmbed.push({ id: photo.id, text, photo, tagObj });
    }
  }

  console.log(`Need to embed ${itemsToEmbed.length} photos (${Object.keys(newEmbeddings).length} already embedded).`);

  const BATCH_SIZE = 25;
  for (let i = 0; i < itemsToEmbed.length; i += BATCH_SIZE) {
    const batch = itemsToEmbed.slice(i, i + BATCH_SIZE);
    const texts = batch.map(b => b.text);

    console.log(`Embedding ${i + 1} to ${Math.min(i + BATCH_SIZE, itemsToEmbed.length)} of ${itemsToEmbed.length}...`);
    const vectors = await getGeminiBatchEmbeddings(texts, apiKey);

    for (let j = 0; j < batch.length; j++) {
      newEmbeddings[batch[j].id] = {
        embedding: vectors[j]
      };
    }

    // Save progress after each batch
    await fs.writeFile(EMBEDS_PATH, JSON.stringify(newEmbeddings, null, 2));
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('3. All embeddings completed. Updating data/photos.json...');
  let existingPhotos = [];
  try {
    existingPhotos = JSON.parse(await fs.readFile(PHOTOS_BACKUP, 'utf8'));
  } catch (e) {
    existingPhotos = [];
  }

  const updatedPhotos = existingPhotos.map(photo => {
    if (newEmbeddings[photo.id]) {
      return {
        ...photo,
        embedding: newEmbeddings[photo.id].embedding
      };
    }
    return photo;
  });

  await fs.writeFile(PHOTOS_PATH, JSON.stringify(updatedPhotos, null, 2));
  console.log(`Done! Successfully updated ${updatedPhotos.length} photos with Gemini 768-dim embeddings.`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
