export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: {
            parts: [{ text }]
          },
          outputDimensionality: 768
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      if (data.embedding && Array.isArray(data.embedding.values)) {
        return data.embedding.values;
      }

      return [];
    } catch (e) {
      retries--;
      if (retries === 0) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return [];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
