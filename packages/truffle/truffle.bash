#!/bin/bash
# Farm everything out to truffle.coffee, using the package-local version of coffee.
export TRUFFLE_WORKING_DIRECTORY=`pwd`

if [ "$TRUFFLE_NPM_LOCATION" == "" ];
then
  export TRUFFLE_NPM_LOCATION=$(npm config --global get prefix)/lib/node_modules/truffle/
fi

cd $TRUFFLE_NPM_LOCATION
$TRUFFLE_NPM_LOCATION/node_modules/.bin/babel-node $TRUFFLE_NPM_LOCATION/truffle.es6 $@
