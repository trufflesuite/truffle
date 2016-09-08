# Location

Your configuration file is called `truffle.js` and is located at the root of your project directory. This file is a Javascript file and can execute any code necessary to create your configuration. It must export an object representing your project configuration like the example below.

### Resolving Naming Conflicts on Windows

When using the Command Prompt on Windows, the default configuration file name can cause a conflict with the `truffle` executable. If this is the case, we recommend using Windows PowerShell or [Git BASH](https://git-for-windows.github.io/) as these shells do not have this conflict. Alternatively, you can rename the configuration file to `truffle-config.js` to avoid this conflict.

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
  rpc: {
    host: "localhost",
    port: 8545
  }
};
```

The default configuration ships with two options specified: `build` and `rpc`. These options as well as non-default options are detailed below.

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

### networks

Specifies which networks are available for deployment during migrations. When compiling and running migrations on a specific network, contract artifacts will be saved and recorded for later use. When your contract abstractions detect that your Ethereum client is connected to a specific network, they'll use the contract artifacts associated that network to simplify app deployment. Networks are identified through Ethereum's `net_version` RPC call.

The `networks` object, shown below, is keyed by a network name and contains a corresponding object that defines the parameters of the network. The `networks` option is not required, but if specified, each network it defines must specify a corresponding `network_id`. If you'd like a specific network configuration to be associated with every network that *doesn't* match any other network in the list, use a `network_id` of "default". However, there should only be one default network. Traditionally, the default network is used during development, where contract artifacts don't matter long-term and the network id continuously changes, for instance, if the TestRPC is restarted.

The network name is used for user interface purposes, such as when running your migrations on a specific network:

```bash
$ truffle migrate --network live
```

You can optionally specify rpc information for each network. Examples below.  

**Example:**

```javascript
networks: {
  "live": {
    network_id: 1, // Ethereum public network
    // optional config values
    // host - defaults to "localhost"
    // port - defaults to 8545
    // gas
    // gasPrice
    // from - default address to use for any transaction Truffle makes during migrations
  },
  "morden": {
    network_id: 2,        // Official Ethereum test network
    host: "178.25.19.88", // Random IP for example purposes (do not use)
    port: 80             
  },
  "staging": {
    network_id: 1337 // custom private network
    // use default rpc settings
  },
  "development": {
    network_id: "default"
  }
}
```

### rpc

Details about how to connect to your ethereum client. The `host` and `port` keys are required. However, a few other keys are available:

* `host`: Hostname pointing to the network location of your Ethereum client (usually "localhost" for development).
* `port`: Port number where your Etheruem client accepts requests. Default is `8545`.
* `gas`: Gas limit used for deploys. Default is `4712388`.  
* `gasPrice`: Gas price used for deploys. Default is `100000000000` (100 Shannon).
* `from`: From address used during migrations. If not specified, defaults to the first available account provided by your Ethereum client.

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

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-83874933-1', 'auto');
  ga('send', 'pageview');
</script>
