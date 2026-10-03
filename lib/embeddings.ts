export async function getEmbedding(text: string): Promise<number[]> {
  const hfToken = process.env.HF_API_KEY;
  const url = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction";
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (hfToken) {
    headers['Authorization'] = `Bearer ${hfToken}`;
  }

  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Hugging Face feature extraction returns either a 1D array or 2D array depending on batching
      if (Array.isArray(data) && data.length > 0) {
        if (Array.isArray(data[0])) {
          return data[0]; // Batch response, return first item
        }
        return data; // 1D array
      }
      
      return [];
    } catch (e) {
      retries--;
      if (retries === 0) throw e;
      await new Promise(r => setTimeout(r, 2000));
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
