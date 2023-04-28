- [x] @truffle/box constructs new Config object in unbox. cannot decouple.
      There may be a way to inject the prototype via caller.

- [x] @truffle/compile-solidity uses it in its types. Cannot easily decouple.

- [x] @truffle/compile-vyper directly invokes Config.default().
- [x] @truffle/core assume it invokes Config member functions.
- [x] @truffle/dashboard invokes Config.getUserConfig().
- [x] @truffle/dashboard-hardhat-plugin invokes Config.detect().
- [x] @truffle/db invokes Config.getTruffleDataDirectory().
- [x] @truffle/db-kit uses type definition for TruffleConfig
- [x] @truffle/external-compile uses @truffle/config's methods
- [x] @truffle/fetch-and-compile uses @truffle/config to define exported functions
- [x] @truffle/from-hardhat uses @truffle/config.default(), and merge
- [ ] @truffle/migrate - maybe?
- [ ] @truffle/require ... maybe?
- [ ] @truffle/test
- [x] @truffle/workflow-compile uses Config.default().merge

## dev dependencies

remove dependency from package manager to help graph analysis?

- tests would work because of node dependency resolution
- is it really needed, if it obfuscates dependency analysis? YES - incase its
  used as a separate package that can be distro over npm.
  Only uses config for tests.
- [x] compile-solidity-tests
- [x] debugger
- [x] decoder
- [x] deployer
- [x] encoder
- [x] profiler
- [x] truffle
