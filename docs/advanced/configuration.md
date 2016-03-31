# Location

Your configuration file is called `truffle.js`, and is located at the root of your project directory. This file is a Javascript file and can execute any code necessary to create your configuration. It must export an object representing your project configuration like the example below.

# Example

```javascript
module.exports = {
  build: {
    "index.html": "index.html",
    "app.js": [
      "javascripts/app.js"
    ],
    "app.css": [
      "stylesheets/app.css"
    ],
    "images/": "images/"
  },
  deploy: [
    "MetaCoin",
    "ConvertLib"
  ],
  rpc: {
    host: "localhost",
    port: 8545
  }
};
```

The default configuration ships with three options specified: `build`, `deploy`, and `rpc`. These options as well as non-default options are detailed below.

# Options

### build

Build configuration of your frontend. By default this configuration invokes the default builder, described in the [Build](/getting_started/build) section, but you can use custom build processes as well. See the [advanced build processes](/advanced/build_processes) section for details.

**Example:**

```javascript
build: {
  "index.html": "index.html",
  "app.js": [
    "javascripts/app.js"
  ],
  "app.css": [
    "stylesheets/app.css"
  ],
  "images/": "images/"
}
```

### deploy

An array of contracts that you want deployed when `truffle deploy` is run. This topic is discussed in detail in the [deploying to the network](/getting_started/deploy) section.

**Example:**

```javascript
deploy: [
  "MetaCoin",
  "ConvertLib"
]
```

### after_deploy

An array of scripts meant to be run after a successful deploy. These scripts are run in order, and executed using the `truffle exec` functionality described in the [external scripts](/getting_started/scripts) section. These scripts have access to the contracts defined within your current environment, and can be used to write custom deployment steps as if you were writing tests or your frontend. Each path is relative to the root directory of your project.

**Example:**

```javascript
after_deploy: [
  "./register_contracts.js",
  "./demo_data.js"
]
```

### rpc

Details about how to connect to your ethereum client. The `host` and `port` keys are required. However, a few other keys are available:

* `host`: Hostname pointing to the network location of your Ethereum client (usually "localhost" for development).
* `port`: Port number where your Etheruem client accepts requests. Default is `8545`.
* `gas`: Gas limit used for deploys. Default is `3141592`.  
* `gasPrice`: Gas price used for deploys. Default is `100000000000` (100 Shannon).
* `from`: From address used in deploys. If not specified, defaults to the first available account provided by your Ethereum client.

**Example:**

```javascript
rpc: {
  host: "localhost",
  port: 8545
}
```

### mocha

Configuration options for the [MochaJS](http://mochajs.org/) testing framework. This configuration expects an object as detailed in Mocha's [documentation](https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically#set-options).

**Example:**

```javascript
mocha: {
  useColors: true
}
```

# Considerations

You can override any of the settings specified in `truffle.js` for each of your environments. See more details in the [environments](/advanced/environments) section.
