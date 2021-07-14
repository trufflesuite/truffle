#!/usr/bin/env bash

docker pull ethereum/client-go:stable

docker run \
	-v /$PWD/scripts:/scripts \
	-i \
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
	js ./scripts/geth-accounts.js
