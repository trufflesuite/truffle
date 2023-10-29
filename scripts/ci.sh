#!/usr/bin/env bash

# Set geth version to stable, or pin to a specific version
# as necessary when geth release breaks CI
# Snoop these 
# - https://hub.docker.com/r/ethereum/client-go
# - https://github.com/ethereum/go-ethereum/releases
GETH_VERSION="stable"
# GETH_VERSION="v1.10.26"

# Exit script as soon as a command fails.
set -o errexit

run_geth() {
	docker run \
		-v /$PWD/scripts:/scripts \
		-t \
		-d \
		-p 8545:8545 \
		-p 8546:8546 \
		-p 30303:30303 \
		"ethereum/client-go:$GETH_VERSION" \
		--http \
		--http.addr '0.0.0.0' \
		--http.port 8545 \
		--http.corsdomain '*' \
		--ws \
		--ws.addr '0.0.0.0' \
		--ws.origins '*' \
		--nodiscover \
		--dev \
		--dev.period 0 \
		--allow-insecure-unlock \
		--preload ./scripts/geth-accounts.js \
		console \
		>/dev/null &
}

if [ "$INTEGRATION" = true ]; then

	sudo add-apt-repository -y ppa:deadsnakes/ppa
	sudo add-apt-repository -y ppa:ethereum/ethereum
	sudo apt install -y jq python3.8 python3.8-dev python3.8-venv solc
	wget https://bootstrap.pypa.io/get-pip.py
	sudo python3.8 get-pip.py
	sudo pip3 install vyper
	lerna run --scope truffle test --stream

elif [ "$GETH" = true ]; then

	sudo apt install -y jq
	docker pull "ethereum/client-go:$GETH_VERSION"
	run_geth
	sleep 30
	lerna run --scope truffle test --stream -- --exit
	lerna run --scope @truffle/contract test --stream -- --exit

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
	sudo apt install -y python3.8 python3.8-dev python3.8-venv solc
	wget https://bootstrap.pypa.io/get-pip.py
	sudo python3.8 get-pip.py
	sudo pip3 install vyper
	lerna run --ignore truffle test --stream --concurrency=1

elif [ "$COVERAGE" = true ]; then

	docker pull ethereum/solc:0.4.22
	sudo add-apt-repository -y ppa:deadsnakes/ppa
	sudo add-apt-repository -y ppa:ethereum/ethereum
	sudo apt update
	sudo apt install -y jq python3.8 python3.8-dev python3.8-venv solc
	wget https://bootstrap.pypa.io/get-pip.py
	sudo python3.8 get-pip.py
	sudo pip3 install vyper
	cd packages/debugger && yarn test:coverage \
		&& cd ../../ && nyc lerna run --ignore debugger test \
		&& cat ./packages/debugger/coverage/lcov.info >>./coverage/lcov.info \
		&& cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

fi
