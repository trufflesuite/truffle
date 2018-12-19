##### Specify your compiler version

Specify the version of Solidity you'd like to use, and Truffle will
automatically download the correct compiler for you! :floppy_disk:

Use this feature by specifying `compilers.solc.version` in your Truffle config.

<details>
<summary>Example: Use the latest <code>solc</code> compatible with v0.4.22</summary>

```javascript
module.exports = {
  /* ... rest of config */

  compilers: {
    solc: {
      version: "^0.4.22"
    }
  }
}
```
</details>

##### Use Docker or native `solc`

Truffle also supports using the Solidity Docker image or a natively installed
`solc` compiler. Using one of these distributions can provide a >3x speed
improvement over the default [solc-js](https://www.npmjs.com/package/solc).

###### Speed Comparison

Using Docker or native binaries provides a significant speed improvement,
particularly when compiling a large number of files.

**Table**: Time to run `truffle compile` on a MacBook Air 1.8GHz, Node v8.11.1:

| Project              | # files | solcjs | docker | native |
|----------------------|---------:| ------:|--------:|-----------:|
| truffle/metacoin-box |       3 |   4.4s |   4.4s |      4.7s |
| gnosis/pm-contracts  |      34 |  21.7s |  10.9s |     10.2s |
| zeppelin-solidity    |     107 |  36.7s |  11.7s |     11.1s |


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
`docker pull ethereum/solc:0.5.1` yourself. Sorry for the inconvenience!

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


##### Note on `compilers` config

The `solc` config property has been moved to `compilers` and normalized a bit.
Compiler settings are now grouped inside `compilers.solc.settings`.
For more information, see the [compiler configuration docs](https://truffleframework.com/docs/truffle/reference/configuration#compiler-configuration).

<details>
<summary>Example compiler settings</summary>

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

</details>
