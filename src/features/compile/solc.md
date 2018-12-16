#### solc
To configure solc, insert a `compilers.solc` property in the truffle config.  For example, suppose you want to use version `0.4.22`.

In the truffle config you would add a `compilers.solc.version` property as follows:
```
module.exports = {
  networks: {
    ......
  },
  compilers: {
    solc: {
      version: "0.4.22"
    }
  }
}
```
