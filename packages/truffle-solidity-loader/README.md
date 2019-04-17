## truffle-solidity-loader

A Webpack loader that allows importing a solidity contract directly. Importing returns a truffle artifact json object. This allows smart contract development with Hot Reloading support and enables migrations to automatically re-run on change. When running a production build, contracts will be bundled into main bundle for easy deployment.

## Example

```javascript
const Web3 = require("web3"); // currently compatible up to web3@1.0.0-beta.37
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
const contract = require("truffle-contract");

import myContractArtifact from '../contracts/MyContract.sol';
const MyContract = contract(myContractArtifact);

MyContract.setProvider(provider);
```

You can see this plugin in operation in the [Truffle+Webpack Demo App](https://github.com/ConsenSys/truffle-webpack-demo). The demo is for Truffle 4.0 & Webpack 4.

This package will re-run migration scripts whenever solidity files are modified. If you have multiple solidity files, the entire project will be redeployed.

## Installation

`$ npm install --save-dev truffle-solidity-loader`

Add the appropriate config to your `loaders` section of your Webpack 4 config:

```javascript
{
  test: /\.sol/,
  use: [
    {
      loader: 'json-loader'
    },
    {
      loader: 'truffle-solidity-loader',
      options: {
        network: 'ganache',
      }
    }
  ]
}
```

Webpack applies loaders [right to left](https://webpack.js.org/api/loaders/#pitching-loader), therefore the output of `truffle-solidity-loader` goes into `json-loader`.


### `truffle-config.js` integration

The loader will auto detect a `truffle-config.js` (or `truffle.js`) config file in your project and use that for configuration.

### Loader options

  - `migrations_directory`: The path truffle migration scripts
  - `network`: A network name to use
  - `contracts_build_directory`: path to directory of truffle JSON artifacts

```javascript
{
  test: /\.sol/,
  use: [
    {
      loader: 'json-loader'
    },
    {
      loader: 'truffle-solidity-loader',
      options: {
        network: 'ganache',
        migrations_directory: path.resolve(__dirname, './migrations'),
        contracts_build_directory: path.resolve(__dirname, './build/contracts')
      }
    }
  ]
}
```


## Contributing

- Open an issue to report bugs or provide feedback.
- Submit PRs.
- Respect the project coding style: StandardJS.

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## License
Copyright (c) Consensys LLC, and authors.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
