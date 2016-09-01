## truffle-solidity-loader

A Webpack loader that will parse and provision Solidity files to Javascript using Truffle for compilation, and utilising Truffle's migrations. This allows you to develop your contracts with Hot Reloading support, and have your migrations automatically re-run on change.

Each time you change a Solidity contract, Webpack will detect the change, recompile the Solidity files, and re-run your Truffle migrations. The updated Solidity contract will be Hot updated in teh browser if enabled.

When you run a production build, the contracts will be bundled into your main bundle for easy deployment.

You can see this plugin in operation in the [Truffle+Webpack Demo App](https://github.com/ConsenSys/truffle-webpack-demo)

A project by ConsenSys and @johnmcdowall.

## Installation

`$ npm install --save-dev truffle-solidity-loader`

Add the appropriate config to your `loaders` section of your Webpack config:

```javascript
{
  test: /\.sol/,
  loader: 'truffle-solidity'
}
```

### `truffle.js` integration

The loader will detect a `truffle.js` (or `truffle-config.js` for Windows users) config file in your project and use that for configuration.

Importantly, you will need to specify the location of your `migrations` directory in the `truffle.js` file like so:

`"migrations_directory": "./migrations"`

You can also override the Truffle config using a loader querystring as outlined below:

```javascript
{
  test: /\.sol/,
  loader: 'truffle-solidity?migrations_directory='+path.resolve(__dirname, '../migrations' )
}
```

### Loader Query string config

  - `migrations_directory`: The path to a directory containing your Truffle migrations
  - `network`: A network name to use
  - `network_id`: A network id to use

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
