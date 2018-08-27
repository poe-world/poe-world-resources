const fs = require('fs');

// Cli params
const CLI_OVERRIDES = process.argv.length >= 3 ? JSON.parse(process.argv[2]) : {};

// Constants
const MAPS_PATH = './maps';
const WIKI_MAPS_PATH = './maps/_wiki.json';
const OUTPUT_JSON_PATH = './maps.json';
const SEXTANT_RANGE = 150;
const DEFAULT_VALUES = {
  fragments: [],
  isTradable: true,
  offsetLeft: 0,
  offsetTop: 0
};

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

if (!fs.existsSync(WIKI_MAPS_PATH)) throw 'You need to "npm run fetch-maps-wiki" first to download the maps from the wiki.';

const wikiMaps = loadJsonFrom(WIKI_MAPS_PATH);

console.log('Assembling maps...')
const preProcessedMaps = Object.keys(wikiMaps).reduce((preProcessedMaps, mapId) => {
  const currentMapOverridePath = `${MAPS_PATH}/${mapId}.json`;
  const wikiMap = wikiMaps[mapId];

  let currentOverride = fs.existsSync(currentMapOverridePath) ? loadJsonFrom(currentMapOverridePath) : {};

  currentOverride = {
    ...DEFAULT_VALUES,
    ...currentOverride,
    ...CLI_OVERRIDES[mapId]
  };

  preProcessedMaps[mapId] = {
    ...wikiMap,
    ...currentOverride
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
