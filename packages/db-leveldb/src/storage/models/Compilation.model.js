const Model = require("../Model");

class Compilation extends Model {
  compiler;
  sources;
  sourceIndexes;
  processedSources;
  sourceMaps;
  contracts;
  immutableReferences;

  async beforeSave() {
    const newId = this.generateID();

    // Key exists in db, but data fields have changed so remove old key
    // This could also become a batch operation and would then be atomic
    if (this.id && this.id !== newId) {
      await Compilation.delete(this.id);
    }
    this.id = newId;
  }

  generateID() {
    return this.sha3(
      JSON.stringify(this.compiler) + JSON.stringify(this.sources)
    );
  }
}

module.exports = Compilation;
