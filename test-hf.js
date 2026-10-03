// Built-in fetch will be used

async function testHF() {
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: "cafe image", options: { wait_for_model: true } }),
    }
  );
  
  if (!response.ok) {
    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
    return;
  }
  
  const data = await response.json();
  console.log("Response type:", typeof data);
  console.log("Is Array?", Array.isArray(data));
  if (Array.isArray(data)) {
    console.log("Length:", data.length);
    if (data.length > 0) {
      console.log("First element type:", typeof data[0]);
      console.log("First element is array?", Array.isArray(data[0]));
    }
  }
}

testHF().catch(console.error);
