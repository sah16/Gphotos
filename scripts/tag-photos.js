require('dotenv').config({ path: '.env.local' });
const fs = require('fs/promises');
const path = require('path');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL_NAME = 'qwen/qwen3.8-27b';

if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
  console.error("GROQ_API_KEY is missing or invalid in .env.local.");
  process.exit(1);
}

const PHOTOS_DIR = path.join(process.cwd(), 'public', 'photos');
const MANIFEST_PATH = path.join(PHOTOS_DIR, 'manifest.json');
const TAGS_PATH = path.join(process.cwd(), 'data', 'tags.json');

async function getGroqTags(base64Image, originalTags, theme) {
  const prompt = `You are an AI photo tagger. I am providing an image.
Please provide a caption and structured attribute tags (people count, setting, objects, time-of-day, colour, activity).
Be specific and descriptive. Avoid generic tags.

Format your response exactly as JSON:
{
  "caption": "A brief, descriptive caption of the photo",
  "tags": ["tag1", "tag2", "tag3"]
}

Context (use this to help identify themes if relevant):
Theme: ${theme}
Source tags: ${originalTags}`;

  const payload = {
    model: MODEL_NAME,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1
  };

  let retries = 3;
  while (retries > 0) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 429) {
        console.log("  Rate limited! Waiting 10s...");
        await new Promise(r => setTimeout(r, 10000));
        retries--;
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq API Error: ${res.status} ${err}`);
      }

      const data = await res.json();
      const content = data.choices[0].message.content;
      try {
        return JSON.parse(content);
      } catch (e) {
        console.error("  Failed to parse JSON from Groq:", content);
        return { caption: "A photo", tags: [] };
      }
    } catch (error) {
      console.error("  Network/API error:", error.message);
      retries--;
      if (retries === 0) return { caption: "A photo", tags: [] };
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

async function main() {
  await fs.mkdir(path.dirname(TAGS_PATH), { recursive: true });

  const manifestData = await fs.readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestData);

  let existingTags = {};
  try {
    const existingData = await fs.readFile(TAGS_PATH, 'utf8');
    existingTags = JSON.parse(existingData);
  } catch (e) {
    // fine if it doesn't exist
  }

  console.log(`Starting to tag ${manifest.length} photos...`);

  for (let i = 0; i < manifest.length; i++) {
    const photo = manifest[i];
    if (existingTags[photo.id]) {
      console.log(`[${i+1}/${manifest.length}] Skipping ${photo.filename} (already tagged)`);
      continue;
    }

    console.log(`[${i+1}/${manifest.length}] Tagging ${photo.filename}...`);
    const imagePath = path.join(PHOTOS_DIR, photo.filename);
    let base64Image;
    try {
      const imgBuffer = await fs.readFile(imagePath);
      base64Image = imgBuffer.toString('base64');
    } catch (e) {
      console.error(`  Could not read image file ${imagePath}. Skipping.`);
      continue;
    }

    const result = await getGroqTags(base64Image, photo.originalTags, photo.theme);
    existingTags[photo.id] = result;

    // Save progressively
    await fs.writeFile(TAGS_PATH, JSON.stringify(existingTags, null, 2));

    // Pace calls to stay under Groq free-tier limits (approx 15-30 RPM for vision usually)
    await new Promise(r => setTimeout(r, 60000));
  }

  console.log(`Finished tagging photos! Saved to ${TAGS_PATH}`);
}

main().catch(console.error);
