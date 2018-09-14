#!/usr/bin/env bash

# The below tells bash to stop the script if any of the commands fail
set -ex

npm run lerna:bootstrap
npm run build:decode-utils # must come before decoder and debugger
npm run build:decoder # must come before debugger
npm run build:debugger