#!/usr/bin/env bash

# The below tells bash to stop the script if any of the commands fail
set -ex

npm run lerna:bootstrap
npm run build:truffle-contract-schema # must come before decode-utils
npm run build:decode-utils # must come before decoder
npm run build:decoder # must come before debugger
npm run build:debugger