#!/usr/bin/env bash

set -o errexit

# Since mocha v4, the test runner doesn't automatically process.exit
# when it's done running. Because we're running geth as a separate client in CI,
# the provider connections stay open and everything hangs. Hence the `--exit` flag.
if [ "$GETH" == true ]; then
  mocha ./test/** --timeout 7000 --grep @geth --colors --exit $@
else
  mocha ./test/** --no-warnings --timeout 7000 --grep @geth --invert --colors --exit $@
fi
