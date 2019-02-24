const fs = require('fs');

// Constants
const MAPS_PATH = './maps';
const MAPS_WIKI_PATH = './maps/_wiki.json';
const MAPS_OFFSETS_PATH = './maps/_offsets.json';
const OUTPUT_JSON_PATH = './maps.json';
const ADDITIONAL_MAP_IDS = [
  'doryanis-machinarium'
];
const DEFAULT_VALUES = {
  fragments: [],
  isTradable: true
};

// Utils
const loadJsonFrom = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));

if (!fs.existsSync(MAPS_WIKI_PATH)) throw 'You need to "node script/scrape-maps-wiki.js" first to download the maps from the wiki.';
if (!fs.existsSync(MAPS_OFFSETS_PATH)) throw 'You need to set the maps offsets using the maps-offset-setup.html tool.';

const mapsOffsets = loadJsonFrom(MAPS_OFFSETS_PATH);
const mapsWiki = loadJsonFrom(MAPS_WIKI_PATH);

console.log('Assembling maps...')
const assembledMaps = Object.keys(mapsWiki).concat(ADDITIONAL_MAP_IDS).map((mapId) => {
  const currentMapOverridePath = `${MAPS_PATH}/${mapId}.json`;
  const mapOverride = fs.existsSync(currentMapOverridePath) ? loadJsonFrom(currentMapOverridePath) : {};
  const mapWiki = mapsWiki[mapId];
  const mapOffsets = mapsOffsets[mapId] || {};

  return {
    ...mapWiki,
    ...mapOffsets,
    ...DEFAULT_VALUES,
    ...mapOverride
  };
});

console.log('Writing the output...');
fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(assembledMaps, null, 2));

console.log('Good luck with your maps !');
