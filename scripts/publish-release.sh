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
lerna version
lerna publish from-package

## Update git branches
RELEASE_BRANCH_NAME=$(git branch --show-current)
git checkout master
git merge $RELEASE_BRANCH_NAME
git push origin master
git checkout develop
git pull origin master

## Reinstall using published version
npm un -g truffle
npm i -g truffle

echo -e "\\n\\nWoo!"
