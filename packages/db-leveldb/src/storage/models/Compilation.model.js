const Model = require("../Model");

class Compilation extends Model {
  compiler = {
    defaultValue: {}
  };
  sources = {
    defaultValue: []
  };
  sourceIndexes = {
    defaultValue: []
  };
  processedSources;
  sourceMaps;
  contracts = {
    defaultValue: []
  };
  immutableReferences;

  async beforeSave() {
    const newId = this.generateID();

    this.id = newId;
  }

  generateID() {
    return this.sha3(
      JSON.stringify(this.compiler) + JSON.stringify(this.sources)
    );
  }
}

module.exports = Compilation;
