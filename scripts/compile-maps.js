const fs = require('fs');

// Constants
const MAPS_PATH = './maps';
const MAPS_WIKI_PATH = './maps/_wiki.json';
const MAPS_OFFSETS_PATH = './maps/_offsets.json';
const OUTPUT_JSON_PATH = './maps.json';
const SEXTANT_RANGE = 150;
const DEFAULT_VALUES = {
  fragments: [],
  isTradable: true,
  pantheon: null
};
const ADDITIONAL_MAP_IDS = ['the-perandus-manor'];

// Utils
const loadJsonFrom = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));

const mapDistance = (mapA, mapB) => {
  const dxSquare = Math.pow(Math.abs(mapB.offsetLeft - mapA.offsetLeft), 2);
  const dySquare = Math.pow(Math.abs(mapB.offsetTop - mapA.offsetTop), 2);
  return Math.sqrt(dxSquare + dySquare);
};

const computeSextantsFor = (map, availableMaps) => {
  if (!availableMaps.includes(map)) return [];

  const mapDistances = availableMaps.map((comparedMap) => ({
    id: comparedMap.id,
    distance: mapDistance(map, comparedMap)
  }));

  return mapDistances
    .sort(({distance: distanceA}, {distance: distanceB}) => distanceA - distanceB)
    .filter(({distance}) => distance <= SEXTANT_RANGE)
    .map(({id}) => id);
};

if (!fs.existsSync(MAPS_WIKI_PATH)) throw 'You need to "node script/scrape-maps-wiki.js" first to download the maps from the wiki.';
if (!fs.existsSync(MAPS_OFFSETS_PATH)) throw 'You need to set the maps offsets using the maps-offset-setup.html tool.';

const mapsOffsets = loadJsonFrom(MAPS_OFFSETS_PATH);
const mapsWiki = loadJsonFrom(MAPS_WIKI_PATH);
const mapIds = Object.keys(mapsWiki).concat(ADDITIONAL_MAP_IDS);

console.log('Assembling maps...')
const preProcessedMaps = mapIds.reduce((preProcessedMaps, mapId) => {
  const currentMapOverridePath = `${MAPS_PATH}/${mapId}.json`;
  const wikiMap = mapsWiki[mapId];

  const mapOverride = fs.existsSync(currentMapOverridePath) ? loadJsonFrom(currentMapOverridePath) : {};
  const mapOffsets = mapsOffsets[mapId] || {};
  
  preProcessedMaps[mapId] = {
    ...wikiMap,
    ...mapOffsets,
    ...DEFAULT_VALUES,
    ...mapOverride
  };

  return preProcessedMaps;
}, {});

console.log('Computing maps...');
const sextantAvailableMaps = Object.values(preProcessedMaps).filter(({type}) => !/(unique|special)/.test(type));
const processedMaps = Object.keys(preProcessedMaps).map((mapId) => {
  const processedMap = preProcessedMaps[mapId];

  return {
    ...processedMap,
    sextants: computeSextantsFor(processedMap, sextantAvailableMaps)
  };
});

console.log('Writing the output...');
fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(processedMaps, null, 2));

console.log('Good luck with your maps !');
