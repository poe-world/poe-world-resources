const rp = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');

// Constants
const WIKI_ROOT_URL = 'https://pathofexile.gamepedia.com';
const OUTPUT_PATH = 'maps/_wiki.json';

// Utils
const fetch = (url) => new Promise((resolve) => rp({ uri: url, transform: (body) => resolve(cheerio.load(body)) }));
const wikiUrl = (uri) => `${WIKI_ROOT_URL}${uri}`;

// Main loop
const mapHash = {};
const main = async () => {
  console.log('Fetching maps index...');
  const $index = await fetch(wikiUrl('/Map'));

  const $mapRows = $index('.wikitable').eq(1).find('tbody tr');
  console.log(`Succesfully loaded the map index. ${$mapRows.length} map(s) found.`);

  for (let i = 1; i < $mapRows.length; i++) {
    const tier = parseInt($mapRows.eq(i).find('td').eq(2).text().trim(), 10);
    const detailsUrl = wikiUrl($mapRows.eq(i).find('td').eq(0).find('a').attr('href'));
    const name = $mapRows.eq(i).find('td').eq(0).find('a').attr('title').replace(/ \([a-z ]+\)$/i, '').replace(/ map/i, '');

    const id = name.toLowerCase().replace(/ /g, '-').replace(/[^a-z\-]/g, '');

    const summaryData = {
      name,
      wikiUrl: detailsUrl,
      areaLevel: parseInt($mapRows.eq(i).find('td').eq(1).text().trim(), 10),
      tier: isNaN(tier) ? null : tier,
      type: $mapRows.eq(i).find('td').eq(3).find('img').attr('alt') === 'yes' ? 'unique' : 'normal',
      layoutRating: $mapRows.eq(i).find('td').eq(4).text().trim(),
      bossRating: $mapRows.eq(i).find('td').eq(5).text().trim(),
      tileset: $mapRows.eq(i).find('td').eq(6).text().trim()
    };

    console.log(`Fetching details for ${name}... (${id})`);
    const $details = await fetch(detailsUrl);

    const detailsData = {
      imageUrl: $details('.infobox-page-container img').attr('src'),
      drops: $details('.item-table tbody tr').map(function() {
        const itemName = $details(this).find('a').attr('title');
        const itemWikiUrl = $details(this).find('a').attr('href');

        if (!itemName) return null;

        return {
          name: itemName,
          wikiUrl: itemWikiUrl ? WIKI_ROOT_URL + itemWikiUrl : null
        };
      }).get()
    };

    mapHash[id] = {
      id,
      ...summaryData,
      ...detailsData
    };
  }
}

main().then(() => {
  console.log('Writing the output...');
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mapHash, null, 2));

  console.log('Good luck with your maps !');
});
