#### Compiler Configuration
There is now a different way of specifying compiler configurations.  Now you add a `compilers` property to the config.  You then specify all your configuration for compilers there.

For example in the Truffle config:
```javascript
module.exports = {
  /* ... rest of config */

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

Truffle also supports using the Solidity Docker image or a natively installed
`solc` compiler. Using one of these distributions can provide a >3x speed
improvement over the default [solc-js](https://www.npmjs.com/package/solc).

##### Speed Comparison

Using Docker or native binaries provides a significant speed improvement,
particularly when compiling a large number of files.


| Project              | # files | solcjs | docker | bin |
|----------------------|---------:| ------:|--------:|-----------:|
| truffle/metacoin-box |       3 |   4.4s |   4.4s |      4.7s |
| gnosis/pm-contracts  |      34 |  21.7s |  10.9s |     10.2s |
| zeppelin-solidity    |     107 |  36.7s |  11.7s |     11.1s |

**Figure**: Times to `truffle compile` on a MacBook Air 1.8GHz, Node 8.11.1


<details>
<summary>See example Docker configuration</summary>

```javascript
module.exports = {
  /* ... */

  compilers: {
    solc: {
      version: "0.4.25",
      docker: true
    }
  }
}
```


**Note**: Truffle doesn't auto-pull Docker images right now. You'll need to run
`docker pull ethereum/solidity:0.5.1` yourself. Sorry for the inconvenience!

</details>

<details>
<summary>See example native configuration</summary>


```javascript
module.exports = {
  /* ... */

  compilers: {
    solc: {
      version: "native",
    }
  }
}
```

**Note** This requires `solc` to be installed and available on your PATH.
For information on installing Solidity, see the [Installing](https://solidity.readthedocs.io/en/v0.5.1/installing-solidity.html)
section of the Solidity docs.
</details>

