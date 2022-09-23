#!/usr/bin/env bash

# The below tells bash to stop the script if any of the commands fail
set -ex

LAST_PUBLISHED_TAG=$(awk -F\" '/"version":/ {print $4}' ./packages/truffle/package.json)

## Get the latest branch states
git checkout master
git pull origin master
git checkout develop
git pull origin develop
git checkout -b release/"$(date +%m-%d-%y.%S)"

## Build
yarn bootstrap

## Get output of changes for release notes
prs-merged-since --repo trufflesuite/truffle --tag v"$LAST_PUBLISHED_TAG" --format markdown
lerna changed
