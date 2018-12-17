#### Compiler Configuration
There is now a different way of specifying compiler configurations.  Now you add a `compilers` property to the config.  You then specify all your configuration for compilers there.

For example in the Truffle config:
```
module.exports = {
  networks: {
    ......
  },
  compilers: {
    solc: {
      version: "0.5.1",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200   // Optimize for how many times you intend to run the code
        },
        evmVersion: "homestead"  // Default: "byzantium"
      }
    }
  }
}
```

#### Using Docker or native `solc` distributions

Hey, did you know? Now you can use the Solidity Docker image or a natively
installed distribution instead of the default [solc-js](https://www.npmjs.com/package/solc).

This can provide a >3x speed improvement!

Docker and native binary compilers process large contract sets faster than
solc-js. If you're just compiling a few contracts at a time, the speedup isn't
significant relative to the overhead of running a command (see below). The
first time Truffle uses a Docker version there's a small delay as it caches the
solc version string and a solcjs companion compiler. All subsequent runs should
be at full speed.

Times to `truffle compile` on a MacBook Air 1.8GHz, Node 8.11.1

| Project              | # files | solcjs | docker | bin |
|----------------------|---------:| ------:|--------:|-----------:|
| truffle/metacoin-box |       3 |   4.4s |   4.4s |      4.7s |
| gnosis/pm-contracts  |      34 |  21.7s |  10.9s |     10.2s |
| zeppelin-solidity    |     107 |  36.7s |  11.7s |     11.1s |

*Note*: Truffle doesn't auto-pull Docker images right now. You'll need to `docker pull ethereum/solidity:0.5.1` yourself. Sorry for the inconvenience!

For information on installing Solidity, see the [corresponding Solidity docs section](https://solidity.readthedocs.io/en/v0.5.1/installing-solidity.html) to learn more.
