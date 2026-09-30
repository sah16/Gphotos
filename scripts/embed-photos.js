require('dotenv').config({ path: '.env.local' });
const fs = require('fs/promises');
const path = require('path');

const TAGS_PATH = path.join(process.cwd(), 'data', 'tags.json');
const EMBEDDINGS_PATH = path.join(process.cwd(), 'data', 'embeddings.json');

// A simple function to tokenize and normalize text for a keyword overlap vector
function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().match(/\b\w+\b/g) || [];
}

async function main() {
  const tagsData = await fs.readFile(TAGS_PATH, 'utf8');
  const tagsMap = JSON.parse(tagsData);
  
  const embeddings = {};
  
  console.log(`Building simple tag/keyword vectors for ${Object.keys(tagsMap).length} photos...`);
  
  for (const [id, data] of Object.entries(tagsMap)) {
    const captionTokens = tokenize(data.caption);
    const tagTokens = data.tags.flatMap(t => tokenize(t));
    
    // Create a unique set of all relevant words for this photo
    const allTokens = new Set([...captionTokens, ...tagTokens]);
    
    embeddings[id] = {
      tagVector: Array.from(allTokens)
    };
  }
  
  await fs.writeFile(EMBEDDINGS_PATH, JSON.stringify(embeddings, null, 2));
  console.log(`Finished building vectors! Saved to ${EMBEDDINGS_PATH}`);
}

main().catch(console.error);
