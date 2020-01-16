#!/usr/bin/env bash

set -o errexit

if [ "$GETH" == true ]; then
  mocha --timeout 50000 --grep '@ganache|@standalone' --invert --colors $@
elif [ "$WINDOWS" == true ]; then
# TODO: This is something we should review and go through for windows. 
# Maybe we need some extra tests we should run for windows only.
#  For now it is equal to GETH==true
  mocha --timeout 50000 --grep '@ganache|@standalone' --invert --colors $@
elif [ "$QUORUM" == true ]; then
  mocha --timeout 50000 --grep @quorum --colors $@
elif [ "$FABRICEVM" == true ]; then
  mocha --timeout 50000 --grep @fabric-evm --colors $@
elif [ "$COVERAGE" == true ]; then
  NO_BUILD=true mocha --no-warnings --timeout 7000 --grep @geth --invert --colors $@
elif [ "$INTEGRATION" == true ]; then
  mocha --no-warnings --timeout 7000 --grep @geth --invert --colors $@
else
  yarn build-cli && mocha --no-warnings --timeout 7000 --grep @geth --invert --colors $@
fi
