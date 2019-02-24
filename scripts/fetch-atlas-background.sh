#!/usr/bin/env bash

echo "Downloading the Atlas background..."
curl --silent 'https://web.poecdn.com/image/Art/2DArt/Atlas/Atlas.png' > atlas.png

echo "Compressing..."
convert atlas.png -quality 85 atlas.jpg

rm atlas.png

echo "Done."
