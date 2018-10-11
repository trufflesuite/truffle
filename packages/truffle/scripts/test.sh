#!/usr/bin/env bash

set -o errexit

if [ "$GETH" == true ]; then
  npm run build-cli && mocha --timeout 50000 --grep @ganache --invert --colors $@
elif [ "$COVERAGE" == true ]; then
  NO_BUILD=true mocha --no-warnings --timeout 7000 --grep @geth --invert --colors $@
else
  npm run build-cli && mocha --no-warnings --timeout 7000 --grep @geth --invert --colors $@
fi
