#!/usr/bin/env bash

set -o errexit

# Define a base inverse grep pattern
INVERSE_GREP="@geth"

# Extend the inverse grep pattern to skip Node >=12 tests
NODE_VERSION="$(node --version)"
if ! yarn semver -r ">=12" $NODE_VERSION; then
  INVERSE_GREP="$INVERSE_GREP|@>=12"
fi

if [ "$GETH" == true ]; then
  mocha --timeout 50000 --grep '@ganache|@standalone' --invert --colors $@
elif [ "$FABRICEVM" == true ]; then
  mocha --timeout 50000 --grep @fabric-evm --colors $@
elif [ "$COVERAGE" == true ]; then
  NO_BUILD=true mocha --no-warnings --timeout 20000 --grep $INVERSE_GREP --invert --colors $@
elif [ "$INTEGRATION" == true ]; then
  mocha --no-warnings --timeout 20000 --grep $INVERSE_GREP --invert --colors $@
else
  yarn build && mocha --no-warnings --timeout 20000 --grep $INVERSE_GREP --invert --colors $@
fi
