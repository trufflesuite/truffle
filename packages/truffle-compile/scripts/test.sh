#!/usr/bin/env bash

set -o errexit

if [ "$CI" = true ]; then
  mocha --timeout 5000
else
  mocha --invert --grep native --timeout 5000
fi
