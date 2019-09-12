#!/usr/bin/env bash

# The below tells bash to stop the script if any of the commands fail
set -ex

## Obtain/check npm access
npm whoami
if [ "$?" != "0" ];
  then
    npm login
fi
node ./scripts/npm-access.js

## Publish packages to npm
lerna publish -- --access=public

## Update git branches
git checkout master
git merge develop
git push origin master
git checkout develop
git pull origin master

## Reinstall using published version
npm un -g truffle
npm i -g truffle

echo -e "\\n\\nWoo!"
