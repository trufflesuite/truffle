#!/usr/bin/env bash

# The below tells bash to stop the script if any of the commands fail
set -ex

distTag=$1 # first arg after yarn publish-dist-tag

# Optional `lerna version` 'bump' command
# must be an explicit version string _or_ one of:
#   'major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', or 'prerelease'.
# Omitting will prompt the user
lernaVersionCommand=$2

currentGitBranch=$(git rev-parse --abbrev-ref HEAD)

if [ "${distTag}" == "" ];
  then
    echo "No tag name given!"
    exit 1
fi

echo "Publishing \"truffle@${distTag}\" from \"${currentGitBranch}\" branch."

## Obtain/check npm access
npm whoami
if [ "$?" != "0" ];
  then
    npm login
fi
node ./scripts/npm-access.js

## Bump package versions and commit
lerna version --no-git-tag-version --preid $distTag $lernaVersionCommand
git add packages/*/package.json
git commit -m "Publish truffle@${distTag}"

## Publish packages to npm
lerna publish from-package --dist-tag ${distTag}

## Update git branch
git push origin $currentGitBranch

## Reinstall using published version
npm un -g truffle
npm i -g truffle@${distTag}

echo -e "\\n\\nWoo!"
