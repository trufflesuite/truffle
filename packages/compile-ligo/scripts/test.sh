#!/usr/bin/env bash

set -o errexit

if [ "$CI" = true ]; then
  mocha --timeout 10000 $@
fi
