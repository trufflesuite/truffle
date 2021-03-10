#! /usr/bin/env sh

NODE_VERSION="$(node --version)"

# If Node version >=12 we run tests
if yarn semver -r ">=12" $NODE_VERSION; then
    yarn jest --verbose --detectOpenHandles $@
# Otherwise we skip the tests since IPFS requires at least Node 12
else
    true
fi
