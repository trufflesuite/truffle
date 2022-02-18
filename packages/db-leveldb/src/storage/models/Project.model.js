const Model = require("../Model");

class Project extends Model {
  name = {
    defaultValue: "default"
  };
  _contracts = {
    defaultValue: []
  };
  _compilations = {
    defaultValue: []
  };
  network;
  networks;
  contractInstances;

  get contracts() {
    return this._contracts.map(data => {
      return Project.models.Contract.build(data);
    });
  }

  set contracts(contracts) {
    this._contracts = contracts;
  }

  get compilations() {
    return this._compilations.map(data => {
      return Project.models.Compilation.build(data);
    });
  }

  set compilations(compilations) {
    this._compilations = compilations;
  }

  getContractIDs() {
    return this.contracts.map(contract => {
      return contract.generateID();
    });
  }

  getCompilationIDs() {
    return this.compilations.map(compilation => {
      return compilation.generateID();
    });
  }

  async beforeSave() {
    this.id = this.generateID();

    for (let i = 0; i < this.contracts.length; i++) {
      await this.contracts[i].save();
    }

    for (let i = 0; i < this.compilations.length; i++) {
      await this.compilations[i].save();
    }
  }

  generateID() {
    return this.name;
  }
}

module.exports = Project;
