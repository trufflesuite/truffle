#!/usr/bin/env bash

# The below tells bash to stop the script if any of the commands fail
set -ex

distTag=$1 # first arg after yarn publish-dist-tag
currentGitBranch=$(git rev-parse --abbrev-ref HEAD)

if [ "${distTag}" == "" ];
  then
    echo "No tag name given!"
    exit 1
fi

echo "Publishing \"truffle@${distTag}\" from \"${currentGitBranch}\" branch."
npm login
node ./scripts/npm-access.js
lerna version --no-git-tag-version --preid $distTag
git add .
git commit -m "Publish truffle@${distTag}"
lerna publish from-package --dist-tag ${distTag}
git push origin $currentGitBranch
npm un -g truffle
npm i -g truffle@${distTag}
echo -e "\\n\\nWoo!"
