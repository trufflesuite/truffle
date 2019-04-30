#!/usr/bin/env bash

set -o errexit

if [ "$GETH" == true ]; then
  yarn build-cli && mocha --timeout 50000 --grep @ganache --invert --colors $@
elif [ "$COVERAGE" == true ]; then
  NO_BUILD=true mocha --no-warnings --timeout 7000 --grep @geth --invert --colors $@
else
  yarn build-cli && mocha --no-warnings --timeout 7000 --grep @geth --invert --colors $@
fi
