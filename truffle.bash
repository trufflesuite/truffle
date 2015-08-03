#!/bin/bash
if [ -z "$TRUFFLE_WORKING_DIRECTORY" ];
then
  export TRUFFLE_WORKING_DIRECTORY=`pwd`
fi

if [ -z "$TRUFFLE_NPM_LOCATION" ];
then
  export TRUFFLE_NPM_LOCATION=$(npm config --global get prefix)/lib/node_modules/truffle/
fi

# Hack. babel-node will clobber -e, and it doesn't look like `--` will stop it.
args=" $@"
args=${args// -e / --environment }
args=${args// -e=/ --environment=}
args=${args// -environment/ --environment}

echo ${args}

cd $TRUFFLE_NPM_LOCATION
$TRUFFLE_NPM_LOCATION/node_modules/.bin/babel-node -- $TRUFFLE_NPM_LOCATION/truffle.es6 ${args}
