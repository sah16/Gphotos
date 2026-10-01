const fs = require('fs');

async function testApi() {
  console.log("=== Testing Phase 4 Relevance Threshold ===");

  async function callSearch(query) {
    const res = await fetch('http://localhost:3000/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  }

  const queries = [
    "birthday image",
    "beach outdoor",
    "group of people",
    "document page"
  ];

  for (const q of queries) {
    console.log(`\n--- Query: '${q}' ---`);
    const data = await callSearch(q);
    console.log(`Pool size (totalMatches): ${data.totalMatches}`);
    if (data.results?.length > 0) {
      console.log(`Top result caption: ${data.results[0].caption.substring(0, 50)}...`);
      console.log(`Top chips: ${data.chips.slice(0, 5).map(c => `${c.label} (${c.matchCount})`).join(', ')}`);
    } else {
      console.log("No results cleared the threshold.");
    }
  }
}

testApi().catch(console.error);
