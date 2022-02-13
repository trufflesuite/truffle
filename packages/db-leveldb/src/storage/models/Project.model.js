const Model = require("../Model");

class Project extends Model {
  name = {
    defaultValue: "default"
  };
  contracts;
  compilations;
  network;
  networks;
  contractInstances;

  beforeSave() {
    this.id = this.name;
  }
}

module.exports = Project;
