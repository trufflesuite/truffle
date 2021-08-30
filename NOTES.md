## TODO
  - [ ] Investigate caching CI options. Would be nice to cache node_modules.
  - [ ] Eventually will have to mirror productions's CI matrix
    - [ ] Docker strategy
    - [ ] GETH strategy [Instructions for Windows install](https://geth.ethereum.org/docs/install-and-build/installing-geth#install-on-windows)
  - [ ] Mocha timeouts are annoying! Seems to be related to downloading solc.
  - [ ] Mocha seems to have different globbing behavior on Windows and non
        windows that effects how tests and helpers are identified. We should be
        more explicit. This will impact the conversions below.

    - [ ] Convert shell scripts to nodejs. use: `r!fd scripts`
      - [ ] packages/codec/scripts
      - [x] packages/compile-solidity/scripts
      - [x] packages/contract-schema/scripts
        - [ ] **TODO: ask-team** json-schems-to-typescript is very behind (^5.5.0) while npmjs indicates v10 . Also, this projects repo https://github.com/bcherny/json-schema-to-typescript/releases is out of sync with npmjs https://www.npmjs.com/package/json-schema-to-typescript The gh repo doesn't have releases associated with NPM!!!
      - [x] packages/contract-tests/scripts
      - [x] packages/preserve-to-buckets/scripts
      - [x] packages/preserve-to-filecoin/scripts
      - [x] packages/preserve-to-ipfs/scripts
      - [ ] packages/truffle/scripts
      - [ ] scripts
      - [ ] package.json  use : `r!rg --vimgrep -t json "[ba]?sh "`
        - [x] packages/contract/package.json:18:17:    "compile": "sh -c \"mkdir -p ./dist\" && browserify --debug ./index.js | exorcist ./dist/truffle-contract.js.map > ./dist/truffle-contract.js && uglifyjs ./dist/truffle-contract.js -o ./dist/truffle-contract.min.js",
        - [x] packages/contract-schema/package.json:21:15:    "build": "sh ./scripts/generate-declarations",

## Tests marked skipped

Use : `r!rg --vimgrep "\.skip\w*?\("`

- [ ] packages/compile-solidity/test/test_JSparser.js:26:5:  it.skip("resolves imports 
- [ ] packages/compile-solidity/test/test_parser.js:64:5:  it.skip("should return 
- [ ] packages/compile-solidity/test/test_supplier.js:15:9:describe.skip("CompilerSupplier"
- [ ] packages/contract-tests/test/methods.js:489:7:    it.skip("errors with a revert reason"
- [ ] packages/contract-tests/test/methods.js:541:11:  describe.skip("web3 wallet"
- [ ] packages/core/test/ethpm.js:13:9:describe.skip("EthPM integration"
- [ ] packages/core/test/lib/services/analytics/google-analytics.js:67:7:    it.skip("sets user-level 
- [ ] packages/deployer/test/deployer.js:277:7:    it.skip("waits for confirmations"
- [ ] packages/interface-adapter/test/quorum-decodeParameters.test.ts:47:5:  it.skip("throws an 'Out of Gas?'
- [ ] packages/preserve-to-buckets/test/buckets.test.ts:8:9:describe.skip("preserve", () => {
- [ ] packages/preserve-to-filecoin/test/filecoin.test.ts:198:13:    describe.skip("Lotus policy
- [ ] packages/truffle/test/scenarios/commands/ethpm.js:38:5:  it.skip("Can locate all the sources
- [ ] packages/truffle/test/scenarios/external_compile.js:16:5:  short circuits test for windows
