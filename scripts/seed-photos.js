require('dotenv').config({ path: '.env.local' });
const fs = require('fs/promises');
const path = require('path');

// Themed queries from architecture/problem statement
const THEMES = [
  'beach outdoor',
  'cafes',
  'birthday festival',
  'group photos',
  'pets',
  'documents',
  'street scenes'
];

const TARGET_TOTAL = 200; 
const TARGET_PER_THEME = Math.ceil(TARGET_TOTAL / THEMES.length);

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!PIXABAY_API_KEY || PIXABAY_API_KEY === 'your_pixabay_api_key_here') {
  console.error("PIXABAY_API_KEY is missing or invalid in .env.local.");
  process.exit(1);
}

const PHOTOS_DIR = path.join(process.cwd(), 'public', 'photos');
const MANIFEST_PATH = path.join(PHOTOS_DIR, 'manifest.json');

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  await fs.writeFile(destPath, Buffer.from(buffer));
}

async function fetchPixabay(query, count) {
  const url = new URL('https://pixabay.com/api/');
  url.searchParams.append('key', PIXABAY_API_KEY);
  url.searchParams.append('q', query);
  url.searchParams.append('per_page', count.toString());
  url.searchParams.append('image_type', 'photo');
  // Safe search just in case
  url.searchParams.append('safesearch', 'true');
  
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Pixabay API error: ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  
  return data.hits.map(hit => ({
    id: `pixabay-${hit.id}`,
    source: 'pixabay',
    url: hit.largeImageURL || hit.webformatURL,
    originalTags: hit.tags // Pixabay returns comma-separated string
  }));
}

async function fetchUnsplash(query, count) {
  if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'your_unsplash_access_key_here') return [];
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.append('query', query);
  url.searchParams.append('per_page', count.toString());
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}` }
  });
  if (!res.ok) {
    console.error(`Unsplash API error: ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  
  return data.results.map(hit => ({
    id: `unsplash-${hit.id}`,
    source: 'unsplash',
    url: hit.urls.regular || hit.urls.small,
    // Unsplash tags can be complex, extract titles if available
    originalTags: hit.tags ? hit.tags.map(t => t.title).join(', ') : ''
  }));
}

async function main() {
  await fs.mkdir(PHOTOS_DIR, { recursive: true });
  const manifest = [];

  console.log(`Starting to seed photos... Target: ~${TARGET_TOTAL} photos across ${THEMES.length} themes.\n`);

  for (const theme of THEMES) {
    console.log(`Fetching photos for theme: "${theme}"`);
    let results = await fetchPixabay(theme, TARGET_PER_THEME);
    
    if (results.length < TARGET_PER_THEME && UNSPLASH_ACCESS_KEY && UNSPLASH_ACCESS_KEY !== 'your_unsplash_access_key_here') {
      const remaining = TARGET_PER_THEME - results.length;
      console.log(`  Pixabay returned ${results.length}. Supplementing ${remaining} photos from Unsplash...`);
      const unsplashResults = await fetchUnsplash(theme, remaining);
      results = results.concat(unsplashResults);
    }
    
    let downloadedCount = 0;
    for (const photo of results) {
      const ext = '.jpg'; 
      const filename = `${photo.id}${ext}`;
      const destPath = path.join(PHOTOS_DIR, filename);
      
      try {
        await downloadImage(photo.url, destPath);
        manifest.push({
          id: photo.id,
          filename,
          source: photo.source,
          theme,
          originalTags: photo.originalTags
        });
        downloadedCount++;
      } catch (err) {
        console.error(`  Error downloading ${photo.url}:`, err.message);
      }
    }
    console.log(`  Successfully downloaded ${downloadedCount} photos for "${theme}".\n`);
    
    // Slight delay to be nice to APIs and avoid concurrent connection issues
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Finished seeding photos!`);
  console.log(`Total photos downloaded: ${manifest.length}`);
  console.log(`Manifest saved to: ${MANIFEST_PATH}`);
}

main().catch(console.error);
