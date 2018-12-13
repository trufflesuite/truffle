### Compiler Configuration
You can now specify/configure compilers in the truffle config! This includes being able to specify a particular version or release of solc in addition to support for Vyper.
Configuration of external compilers is also now supported!

#### solc
To configure solc, insert a `compilers.solc` property in the truffle config.  For example, suppose you want to use version `0.4.22`.

In `truffle-config.js`
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

#### external compilers

For more information on configuring the compilers, see the [docs](https://truffleframework.com/docs/truffle/reference/configuration#compiler-configuration).
