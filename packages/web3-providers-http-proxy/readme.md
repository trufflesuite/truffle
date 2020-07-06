# web3-provider-proxy
An http provider port from web3, which can proxy eth rpc request to [conflux](https://confluxnetwork.org/).


### how to use

Install through npm
```sh
$ npm install web3-providers-http-proxy
```
Initiate and set to web3 or contract object.

```js
const {HttpProvider, ethToConflux} = require('web3-providers-http-proxy');
const provider = new HttpProvider('http://localhost:12539', {
    chainAdaptor: ethToConflux
});
web3.setProvider(provider);
```

### how to write an adaptor


### Implemented rpc method

1. eth_blockNumber -> cfx_epochNumber
2. eth_call -> cfx_call


### How to test this provider

