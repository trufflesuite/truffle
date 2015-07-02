#!/bin/bash
# Farm everything out to grunt, using the package-local version.
export TRUFFLE_WORKING_DIRECTORY=`pwd`

if [ "$TRUFFLE_NPM_LOCATION" == "" ]; 
then 
  export TRUFFLE_NPM_LOCATION=$(npm config --global get prefix)/lib/node_modules/truffle/ 
fi

cd $TRUFFLE_NPM_LOCATION
$TRUFFLE_NPM_LOCATION/node_modules/.bin/coffee $TRUFFLE_NPM_LOCATION/truffle-exec.coffee -- $@