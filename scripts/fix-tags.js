const fs = require('fs/promises');
const path = require('path');

async function fixTags() {
  const tagsPath = path.join(process.cwd(), 'data', 'tags.json');
  try {
    const data = await fs.readFile(tagsPath, 'utf8');
    const tagsObj = JSON.parse(data);

    for (const id in tagsObj) {
      if (tagsObj[id].tags) {
        tagsObj[id].tags = tagsObj[id].tags.map(tag => {
          let t = tag.toLowerCase().trim();
          if (t.includes('people: 0') || t === '0 people' || t === 'no people') return 'People Count: 0';
          if (t.includes('people: 1') || t === '1 person') return 'People Count: 1';
          if (t.includes('people: 2') || t === '2 people') return 'People Count: 2';
          if (t.includes('people: 3') || t === '3 people') return 'People Count: 3';
          if (t.includes('people: 4') || t === '4 people') return 'People Count: 4';
          if (t.includes('people: 5') || t === '5 people') return 'People Count: 5';
          if (t.includes('indoor')) return 'Setting: indoor';
          if (t.includes('outdoor')) return 'Setting: outdoor';
          if (t.includes('daytime') && !t.includes('time-of-day:')) return 'Time of Day: daytime';
          if (t.includes('night') && !t.includes('time-of-day:')) return 'Time of Day: night';
          
          if (t === 'birthday celebration') return 'Action: birthday celebration';
          if (t === 'beach') return 'Setting: beach';
          return tag;
        });
        // deduplicate tags per photo just in case
        tagsObj[id].tags = [...new Set(tagsObj[id].tags)];
      }
    }

    await fs.writeFile(tagsPath, JSON.stringify(tagsObj, null, 2));
    console.log("Fixed tags.json successfully.");
  } catch (e) {
    console.error(e);
  }
}

fixTags();
