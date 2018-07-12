#!/usr/bin/env bash

set -o errexit

if [ "$CI" = true ]; then
  mocha --timeout 10000
else
  mocha --invert --grep native --timeout 10000
fi
