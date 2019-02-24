// Vendors
const rp = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');

// Constants
const WIKI_ROOT_URL = 'https://pathofexile.gamepedia.com';
const OUTPUT_PATH = 'maps/_wiki.json';

// Utils
const generateIdFrom = (string) => string.toLowerCase().replace(/ /g, '-').replace(/[^a-z\-]/g, '');
const fetch = (url) => new Promise((resolve) => rp({ uri: url, transform: (body) => resolve(cheerio.load(body)) }));
const wikiUrl = (uri) => `${WIKI_ROOT_URL}${uri}`;
const scrapeMapLink = ($mapLink) => {
  const name = $mapLink.attr('title').replace(/ \([a-z ]+\)$/i, '').replace(/ map/i, '');

  return {
    wikiUrl: wikiUrl($mapLink.attr('href')),
    name,
    id: generateIdFrom(name)
  };
}

// Main loop
const main = async () => {
  const mapHash = {};
  const pantheonHash = {};
  const complementaryHash = {};

  console.log('Fetching pantheon index...');
  const $pantheon = await fetch(wikiUrl('/The_Pantheon'));

  const $majorGods = $pantheon('.wikitable').eq(0);
  const majorGods = $majorGods.find('tbody tr td[rowspan="4"] b').map(function() {
    return cheerio(this).text();
  });

  $majorGods.find('.c-item-hoverbox a').each(function(index) {
    const $mapLink = cheerio(this);
    const {id: mapId} = scrapeMapLink($mapLink);

    pantheonHash[mapId] = {
      god: majorGods[Math.floor(index / 3)],
      type: 'major',
      upgrade: $mapLink.closest('td').find('.text-color.-mod').text().trim()
    };
  });

  const $minorGods = $pantheon('.wikitable').eq(1);
  const minorGods = $minorGods.find('tbody tr td[rowspan="2"] b').map(function() {
    return cheerio(this).text();
  });

  $minorGods.find('.c-item-hoverbox a').each(function(index) {
    const $mapLink = cheerio(this);
    const {id: mapId} = scrapeMapLink($mapLink);

    pantheonHash[mapId] = {
      god: minorGods[index],
      type: 'minor',
      upgrade: $mapLink.closest('td').find('.text-color.-mod').text().trim()
    };
  });

  console.log('Fetching complementary data...');
  const $complementary = await fetch(wikiUrl('/List_of_maps'));

  $complementary('.wikitable').eq(0).find('tr').each(function(index) {
    if (index === 0) return;
    const $complementaryRow = cheerio(this);

    const {id: mapId} = scrapeMapLink($complementaryRow.find('td').eq(0).find('a'));
    const sextants = $complementaryRow.find('td').eq(4).find('.c-item-hoverbox__activator a').map(function() {
      return scrapeMapLink(cheerio(this)).id;
    }).get();

    complementaryHash[mapId] = {
      guildTag: $complementaryRow.find('td').eq(3).text().trim(),
      sextants,
    };
  });

  console.log('Fetching maps index...');
  const $index = await fetch(wikiUrl('/Map'));

  const mapRows = $index('.wikitable').eq(1).find('tr').toArray();
  mapRows.shift();

  console.log(`Succesfully loaded the map index. ${mapRows.length} map(s) found.`);

  for (let mapRow of mapRows) {
    const $mapRow = cheerio(mapRow);

    const tier = parseInt($mapRow.find('td').eq(2).text().trim(), 10);
    const {id, name, wikiUrl} = scrapeMapLink($mapRow.find('td').eq(0).find('a'));

    const summaryData = {
      name,
      wikiUrl,
      areaLevel: parseInt($mapRow.find('td').eq(1).text().trim(), 10),
      tier: isNaN(tier) ? null : tier,
      type: $mapRow.find('td').eq(3).find('img').attr('alt') === 'yes' ? 'unique' : 'normal',
      layoutRating: $mapRow.find('td').eq(4).text().trim(),
      bossRating: $mapRow.find('td').eq(5).text().trim(),
      tileset: $mapRow.find('td').eq(6).text().trim()
    };

    console.log(`Fetching details for ${name} (${id})...`);
    const $details = await fetch(wikiUrl);

    const drops = $details('.item-table tbody tr').map(function() {
      const itemName = $details(this).find('a').attr('title');
      const itemWikiUrl = $details(this).find('a').attr('href');

      if (!itemName) return null;

      return {
        name: itemName,
        wikiUrl: itemWikiUrl ? WIKI_ROOT_URL + itemWikiUrl : null
      };
    }).get();

    const upgradePaths = $details('.wikitable').eq(1).find('.upgraded-from-set').map(function() {
      const $upgradePath = cheerio(this);
      const {id: mapId} = scrapeMapLink($upgradePath.find('.c-item-hoverbox a'));

      return {
        amount: parseInt($upgradePath.find('td').eq(0).text(), 10),
        id: mapId
      };
    }).get();

    const {guildTag, sextants} = complementaryHash[id] || {};

    mapHash[id] = {
      id,
      ...summaryData,
      imageUrl: $details('.infobox-page-container img').attr('src'),
      drops,
      upgradePaths,
      pantheon: pantheonHash[id] || null,
      guildTag: guildTag || null,
      sextants: sextants || []
    };
  }

  return mapHash;
}

main().then(mapHash => {
  console.log('Writing the output...');
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mapHash, null, 2));

  console.log('Good luck with your maps !');
});
