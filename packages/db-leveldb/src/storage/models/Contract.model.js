const Model = require("../Model");

class Contract extends Model {
  contractName = {
    defaultValue: ""
  };
  abi = {
    defaultValue: []
  };
  metadata = {
    defaultValue: ""
  };
  devdoc = {
    defaultValue: ""
  };
  userdoc = {
    defaultValue: ""
  };
  sourcePath = {
    defaultValue: ""
  };
  source = {
    defaultValue: ""
  };
  sourceMap = {
    defaultValue: ""
  };
  ast = {
    defaultValue: {}
  };
  legacyAST = {
    defaultValue: {}
  };
  bytecode = {
    defaultValue: ""
  };
  deployedBytecode = {
    defaultValue: ""
  };
  compiler = {
    defaultValue: {}
  };

  processedSource;
  createBytecode;
  callBytecode;
  callBytecodeGeneratedSources;
  createBytecodeGeneratedSources;

  async beforeSave() {
    const newId = this.generateID();

    this.id = newId;
  }

  generateID() {
    return this.sha3(
      this.name +
        JSON.stringify(this.abi) +
        JSON.stringify(this.processedSource) +
        JSON.stringify(this.compilation)
    );
  }
}

module.exports = Contract;
