#!/usr/bin/env bash

# The below tells bash to stop the script if any of the commands fail
set -ex

yarn lerna:bootstrap
yarn build:interface-adapter
yarn build:truffle-contract-schema # must come before decode-utils
yarn build:decode-utils # must come before decoder
yarn build:decoder # must come before debugger
yarn build:debugger
yarn build:truffle-db
