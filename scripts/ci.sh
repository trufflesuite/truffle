#!/usr/bin/env bash

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
		ethereum/client-go:stable \
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
	docker pull ethereum/client-go:v1.10.19
	run_geth
	sleep 30
	lerna run --scope truffle test --stream -- --exit
	lerna run --scope @truffle/contract test --stream -- --exit

elif [ "$PACKAGES" = true ]; then

	docker pull ethereum/solc:0.4.22
	sudo add-apt-repository -y ppa:deadsnakes/ppa
	sudo add-apt-repository -y ppa:ethereum/ethereum
	sudo apt update
	sudo apt install -y python3.8 python3.8-dev python3.8-venv solc
	wget https://bootstrap.pypa.io/get-pip.py
	sudo python3.8 get-pip.py
	sudo pip3 install vyper
	lerna run --ignore truffle --scope @truffle/box test --stream --concurrency=1

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
