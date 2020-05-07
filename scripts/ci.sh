#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

run_geth() {
  docker run \
    -v /$PWD/scripts:/scripts \
    -d \
    -p 8545:8545 \
    -p 8546:8546 \
    -p 30303:30303 \
    ethereum/client-go:stable \
    --rpc \
    --rpcaddr '0.0.0.0' \
    --rpcport 8545 \
    --rpccorsdomain '*' \
    --ws \
    --wsaddr '0.0.0.0' \
    --wsorigins '*' \
    --nodiscover \
    --dev \
    --dev.period 0 \
    --allow-insecure-unlock \
    --targetgaslimit '7000000' \
    js ./scripts/geth-accounts.js \
    > /dev/null &
}

if [ "$INTEGRATION" = true ]; then

  sudo apt install -y jq
  lerna run --scope truffle test --stream

elif [ "$GETH" = true ]; then

  sudo apt install -y jq
  docker pull ethereum/client-go:stable
  run_geth
  sleep 30
  lerna run --scope truffle test --stream -- --exit
  lerna run --scope @truffle/contract test --stream -- --exit

elif [ "$QUORUM" = true ]; then

  sudo rm /usr/local/bin/docker-compose
  curl -L https://github.com/docker/compose/releases/download/1.21.0/docker-compose-`uname -s`-`uname -m` > docker-compose
  chmod +x docker-compose
  sudo mv docker-compose /usr/local/bin
  git clone https://github.com/jpmorganchase/quorum-examples
  cd quorum-examples
  docker-compose up -d
  sleep 60
  lerna run --scope truffle test --stream -- --exit

elif [ "$COLONY" = true ]; then

  git clone https://github.com/JoinColony/colonyNetwork.git
  cd colonyNetwork && yarn
  git submodule update --init
  truffle version
  truffle compile --compilers.solc.parser=solcjs && truffle compile --compilers.solc.parser=solcjs --contracts_directory 'lib/dappsys/[!note][!stop][!proxy][!thing][!token]*.sol' && bash ./scripts/provision-token-contracts.sh
  npm run start:blockchain:client & truffle migrate --compilers.solc.parser=solcjs --reset --compile-all && truffle test --compilers.solc.parser=solcjs ./test/contracts-network/* ./test/extensions/* --network development

elif [ "$FABRICEVM" = true ]; then

  root=$(pwd)
  sudo add-apt-repository -y ppa:rmescandon/yq
  sudo apt update
  sudo apt install -y yq
  eval "$(curl -sL https://raw.githubusercontent.com/travis-ci/gimme/master/gimme | GIMME_GO_VERSION=1.12 bash)"
  cd $GOPATH
  mkdir -p src/github.com/hyperledger
  cd src/github.com/hyperledger
  git clone https://github.com/hyperledger/fabric-chaincode-evm
  curl -sSL http://bit.ly/2ysbOFE | bash -s 1.4.1
  cd fabric-samples/first-network
  yq w -i docker-compose-cli.yaml "services.cli.volumes[+]" "./../../fabric-chaincode-evm:/opt/gopath/src/github.com/hyperledger/fabric-chaincode-evm"
  yes Y | ./byfn.sh up
  docker exec -it cli sh -c "peer chaincode install -n evmcc -l golang -v 0 -p github.com/hyperledger/fabric-chaincode-evm/evmcc &&
    peer chaincode instantiate -n evmcc -v 0 -C mychannel -c '{\"Args\":[]}' -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
  cd ../../fabric-chaincode-evm
  make fab3
  # Environment Variables for Fab3:
  export FAB3_CONFIG=${GOPATH}/src/github.com/hyperledger/fabric-chaincode-evm/examples/first-network-sdk-config.yaml
  export FAB3_USER=User1
  export FAB3_ORG=Org1
  export FAB3_CHANNEL=mychannel
  export FAB3_CCID=evmcc
  export FAB3_PORT=5000
  bin/fab3 &>/dev/null &
  cd $root
  lerna run --scope truffle test --stream -- --exit

elif [ "$PACKAGES" = true ]; then

  docker pull ethereum/solc:0.4.22
  sudo add-apt-repository -y ppa:deadsnakes/ppa
  sudo add-apt-repository -y ppa:ethereum/ethereum
  sudo apt update
  sudo apt install -y python3.6 python3.6-dev python3.6-venv solc
  wget https://bootstrap.pypa.io/get-pip.py
  sudo python3.6 get-pip.py
  sudo pip3 install vyper
  lerna run --ignore truffle test --stream --concurrency=1

elif [ "$COVERAGE" = true ]; then

  docker pull ethereum/solc:0.4.22
  sudo add-apt-repository -y ppa:deadsnakes/ppa
  sudo add-apt-repository -y ppa:ethereum/ethereum
  sudo apt update
  sudo apt install -y jq python3.6 python3.6-dev python3.6-venv solc
  wget https://bootstrap.pypa.io/get-pip.py
  sudo python3.6 get-pip.py
  sudo pip3 install vyper
  cd packages/debugger && yarn test:coverage && \
  cd ../../ && nyc lerna run --ignore debugger test && \
  cat ./packages/debugger/coverage/lcov.info >> ./coverage/lcov.info && \
  cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

fi
