#!/usr/bin/env bash

# The below tells bash to stop the script if any of the commands fail
set -ex

currentGitBranch=$(git rev-parse --abbrev-ref HEAD)

if [ "$1" == "" ];
  then
    echo "No tag name given!"
    exit 1
fi

echo "Publishing \"truffle@$1\" from \"${currentGitBranch}\" branch."
npm login
node ./scripts/npm-access.js
lerna version --no-git-tag-version
git add .
git commit -m "Publish truffle@$1"
lerna publish from-package --dist-tag $1
git push origin $currentGitBranch
npm un -g truffle
npm i -g truffle@$1
echo -e "\\n\\nWoo!"
