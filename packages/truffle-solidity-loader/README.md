## truffle-solidity-loader

A Webpack loader allows importing a solidity contract that return a truffle artifact json object. This allows you to develop your contracts with Hot Reloading support, and have your migrations automatically re-run on change. When you run a production build, the contracts will be bundled into your main bundle for easy deployment.

## Example

```javascript
var provider = new Web3.providers.HttpProvider("http://localhost:8545");
var contract = require("truffle-contract");

// Instead of including a built json file
import myContract_artifacts from '../build/contracts/MyContract.json'
var MyContract = contract(myContract_artifacts)

//You can import the solidity contract directly
import myContract_artifacts from '../contracts/MyContract.sol'
var MyContract = contract(myContract_artifacts)

MyContract.setProvider(provider);
```

You can see this plugin in operation in the [Truffle+Webpack Demo App](https://github.com/ConsenSys/truffle-webpack-demo). The demo is for Truffle 4.0 & Webpack 4.

This pacakge will re-run the migration script whenever a solidity file is modified. If you have multiple solidity files, the entire project will be overridden.

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


### `truffle.js` integration

The loader will auto detect a `truffle.js` (or `truffle-config.js` for Windows users) config file in your project and use that for configuration.

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
        contracts_build_directory: path.resolve(__dirname, '../build/contracts')
      }
    }
  ]
}
```


## Contributing

- Write issue in the Issue Tracker.
- Submit PRs.
- Respect the project coding style: StandardJS.

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## License
Copyright (c) Consensys LLC, and authors.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.