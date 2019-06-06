#!/usr/bin/env bash

set -o errexit

if [ "$GETH" == true ]; then
  mocha --timeout 50000 --grep '@ganache|@standalone' --invert --colors $@
elif [ "$COVERAGE" == true ]; then
  NO_BUILD=true mocha --no-warnings --timeout 7000 --grep @geth --invert --colors $@
elif [ "$INTEGRATION" == true ]; then
  mocha --no-warnings --timeout 7000 --grep @geth --invert --colors $@
else
  yarn build-cli && mocha --no-warnings --timeout 7000 --grep @geth --invert --colors $@
fi
