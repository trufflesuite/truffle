const Model = require("../Model");

class Project extends Model {
  name = {
    defaultValue: "default"
  };
  contracts = {
    defaultValue: []
  };
  compilations = {
    defaultValue: []
  };
  network;
  networks;
  contractInstances;

  async beforeSave() {
    this.id = this.name;
    const { Contract, Compilation } = Project.models;
    for (let i = 0; i < this.contracts.length; i++) {
      await Contract.create(this.contracts[i]);
    }

    for (let i = 0; i < this.compilations.length; i++) {
      await Compilation.create(this.compilations[i]);
    }
  }
}

module.exports = Project;
