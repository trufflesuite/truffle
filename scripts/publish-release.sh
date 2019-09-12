#!/usr/bin/env bash

# The below tells bash to stop the script if any of the commands fail
set -ex

npm whoami
if [ "$?" != "0" ];
  then
    npm login
fi

node ./scripts/npm-access.js
lerna publish -- --access=public
git checkout master
git merge develop
git push origin master
git checkout develop
git pull origin master
npm un -g truffle
npm i -g truffle
echo -e "\\n\\nWoo!"
