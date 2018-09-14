const path = require('path');
const assert = require('assert');

const Config = require('truffle-config');
const compile = require('../index');

describe('vyper compiler', function () {
  this.timeout(10000);

  const config = new Config().merge({
    contracts_directory: path.join(__dirname, './sources/'),
    quiet: true,
    all: true,
  });

  it('compiles vyper contracts', function (done) {
    compile.all(config, function (err, contracts, paths) {
      assert.equal(err, null, 'Compiles without error');

      paths.forEach(function (path) {
        assert.notEqual(path.indexOf('.vy'), -1, 'Paths have only .vy files');
      });

      assert.notEqual(contracts.VyperContract, undefined, 'Compiled contracts have VyperContract');

      const contract = contracts.VyperContract;

      assert.equal(contract.contract_name, 'VyperContract', 'Contract name is set correctly');

      assert.notEqual(contract.abi.indexOf('vyper_action'), -1, 'ABI has function from contract present');

      const hex_regex = /^[x0-9a-fA-F]+$/;

      assert(hex_regex.test(contract.bytecode), 'Bytecode has only hex characters');
      assert(hex_regex.test(contract.deployedBytecode), 'Deployed bytecode has only hex characters');

      assert.equal(contract.compiler.name, 'vyper', 'Compiler name set correctly');

      done();
    });
  });

  it('skips solidity contracts', function (done) {
    compile.all(config, function (err, contracts, paths) {
      assert.equal(err, null, 'Compiles without error');

      paths.forEach(function (path) {
        assert.equal(path.indexOf('.sol'), -1, 'Paths have no .sol files');
      });

      assert.equal(contracts.SolidityContract, undefined, 'Compiled contracts have no SolidityContract');

      done();
    });
  });

});
