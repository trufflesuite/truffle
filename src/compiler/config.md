### Compiler Configuration
You can now specify/configure compilers in the truffle config! This includes being able to specify a particular version or release of solc in addition to support for Vyper.
Configuration of external compilers is also now supported!

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

#### external compilers
In cases where you need a bit more customization, you can now add an `external` property to the config.  You would use this in cases where you have a command that generates artifacts, a command that generates custom artifacts from Truffle artifacts, or where you want to customize the artifacts that Truffle generates.

If you were to have a script named `myScript.sh` which outputs artifacts to `./myBuildFolder`, you would configure the truffle config file as follows:
```javascript
module.exports = {
  compilers: {
    external: {
      command: "myScript.sh",
      targets: [{
        path: "./myBuildFolder/*.json"
      }]
    }
  }
}
```
This would run your compilation script, locate all the json files in `myBuildFolder`, and then copy them into your Truffle project's build folder with the rest of your compiled contracts as part of the compilation process.

For more information on configuring the compilers, see the [docs](https://truffleframework.com/docs/truffle/reference/configuration#compiler-configuration).
