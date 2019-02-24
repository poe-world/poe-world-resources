#!/usr/bin/env bash

echo "Switching git branches"
git checkout master
git pull
git checkout auto-updates
git reset --hard master

echo "Downloading the Atlas background..."
curl --silent 'https://web.poecdn.com/image/Art/2DArt/Atlas/Atlas.png' > atlas.png

echo "Scraping the wiki for maps..."
node scripts/scrape-maps-wiki.js

echo "Recompiling maps..."
node scripts/compile-maps.js

if [[ -z $(git diff --quiet) ]]
then
  echo "No changes detected, quitting."
else
  echo "Pushing changes to git..."
  git commit --all --message="Auto update";
  git push origin auto-updates

  echo "Alerting the Discord channel..."
  curl --data '{"content":"Changes detected !\nDetails: https://github.com/poe-world/poe-world-resources/compare/master...auto-updates"}' --header "Content-Type: application/json" -X POST https://discordapp.com/api/webhooks/$1
fi

git checkout master

echo "Done."
