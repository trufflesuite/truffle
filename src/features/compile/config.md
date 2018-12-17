### Compiler Configuration
There is now a different way of specifying compiler configurations.  Now you add a `compilers` property to the config.  You then specify all your configuration for compilers there.

For example in the Truffle config:
```
module.exports = {
  networks: {
    ......
  },
  compilers: {
    solc: {
      version: "0.5.1"
      settings: {
        optimizer: {
          enabled: true,
          runs: 200   // Optimize for how many times you intend to run the code
        },
        docker: true, // Use a version obtained through docker
                      // Note: Truffle does not automatically pull Docker images automatically.
                      // Make sure you manually pull down the specified version (run 'docker pull ...') before enabling this.
        evmVersion: "homestead"  // Default: "byzantium"
      }
    }
  }
}
```
