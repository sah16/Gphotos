export async function normalizeQuery(query: string): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("GROQ_API_KEY not found. Falling back to basic tokenization.");
    return query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: "You are a search query normalizer. Extract the core intent, keywords, and 1-2 synonyms from the user's photo search query. Return ONLY a comma-separated list of lowercase words. Do not include introductory text."
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      })
    });

    if (!response.ok) {
      console.error("Groq API error:", await response.text());
      return query.toLowerCase().split(/\s+/);
    }

    const data = await response.json();
    const resultText = data.choices[0]?.message?.content || "";
    
    // Parse the comma-separated output
    const terms = resultText.split(',')
        .map((t: string) => t.trim().toLowerCase())
        .filter((t: string) => t.length > 0);

    return terms.length > 0 ? terms : query.toLowerCase().split(/\s+/);
  } catch (error) {
    console.error("Error calling Groq:", error);
    return query.toLowerCase().split(/\s+/);
  }
}
