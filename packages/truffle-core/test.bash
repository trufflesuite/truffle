#!/bin/bash
export TRUFFLE_WORKING_DIRECTORY=`pwd`
export TRUFFLE_NPM_LOCATION=`pwd`

$TRUFFLE_NPM_LOCATION/node_modules/.bin/babel-node -- $TRUFFLE_NPM_LOCATION/truffle.es6 test
