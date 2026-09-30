const fs = require('fs');

async function testApi() {
  console.log("=== Testing Phase 4 API Layer ===");

  async function callSearch(query) {
    const res = await fetch('http://localhost:3000/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  }

  async function callRefine(query, selectedChips) {
    const res = await fetch('http://localhost:3000/api/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, selectedChips })
    });
    return res.json();
  }

  // 1. Obvious match
  console.log("\n--- 1. Obvious Match: 'birthday cake' ---");
  let data = await callSearch('birthday cake');
  console.log("Results count:", data.results?.length);
  if (data.results?.length > 0) {
    console.log("Top result id:", data.results[0].id, "Caption:", data.results[0].caption.substring(0, 50) + '...');
    console.log("Top chips:", data.chips.slice(0, 3).map(c => `${c.label} (${c.matchCount})`).join(', '));
  } else {
    console.log("No results");
  }

  // 2. Vague query returning a large pool
  console.log("\n--- 2. Vague query: 'nature' ---");
  data = await callSearch('nature');
  console.log("Results count:", data.results?.length);
  if (data.results?.length > 0) {
    console.log("Top result caption:", data.results[0].caption.substring(0, 50) + '...');
    console.log("Top chips:", data.chips.slice(0, 5).map(c => `${c.label} (${c.matchCount})`).join(', '));
  }

  // 3. Target requires at least one refinement step
  console.log("\n--- 3. Needs refinement: 'people outdoors' ---");
  data = await callSearch('people outdoors');
  console.log("Results count:", data.results?.length);
  if (data.chips && data.chips.length > 0) {
      const selectedChip = data.chips[0].label;
      console.log(`Selecting chip: '${selectedChip}'`);
      const refineData = await callRefine('people outdoors', [selectedChip]);
      console.log("Refined Results count:", refineData.results?.length);
      if (refineData.results?.length > 0) {
          console.log("Top refined result:", refineData.results[0].caption.substring(0, 50) + '...');
          console.log("Refined Top chips:", refineData.chips.slice(0, 3).map(c => `${c.label} (${c.matchCount})`).join(', '));
      }
  }

}

testApi().catch(console.error);
