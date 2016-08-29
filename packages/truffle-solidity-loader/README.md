## truffle-solidity-loader

A Webpack loader that will parse and provision Solidity files to Javascript using Truffle for compilation, and utilising Truffle's migrations. This allows you to develop your contracts with Hot Reloading support, and have your migrations automatically re-run on change.

A project by ConsenSys and @johnmcdowall.

## Installation

`$ npm install --save-dev truffle-solidity-loader`

Add the appropriate config to your `loaders` section of your Webpack config:

```javascript
{
  test: /\.sol/, loader: 'truffle-solidity?web3_rpc_uri='+process.env.WEB3_RPC_LOCATION+'&migrations_directory='+path.resolve(__dirname, '../migrations' )
}
```

### Loader Query string config

  - `web3_rpc_uri`: The URI of the Web3 RPC endpoint with which to provision your contracts (Required)
  - `migrations_directory`: The path to a directory containing your Truffle migrations (Required)
  - `network`: A network name to use (optional: defaults to `default`)
  - `network_id`: A network id to use (optional: defaults to `default`)

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
