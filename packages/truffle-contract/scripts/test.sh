#!/usr/bin/env bash

set -o errexit

if [ "$GETH" == true ]; then
  mocha --timeout 50000 --grep @geth --colors --exit
else
  mocha --no-warnings --timeout 7000 --colors --exit
fi
