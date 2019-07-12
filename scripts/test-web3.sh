#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

link_web3() {
  git clone https://github.com/ethereum/web3.js.git ../web3.js
  pushd ../web3.js
  git checkout release/1.0
  npm install
  npm run build
  pushd packages/web3
  yalc publish

  popd
  popd

  for pkg in packages/*
  do
    cd $pkg
    yalc add web3
    cd ../..
  done
}


# use yalc instead of yarn link
npm install -g yalc

link_web3

# bootstrap again to rebuild with linked
yarn bootstrap
