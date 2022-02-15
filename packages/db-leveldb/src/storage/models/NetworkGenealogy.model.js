const Model = require("../Model");

class NetworkGenealogy extends Model {
  ancestor;
  descendant;

  async beforeSave() {
    const newId = this.generateID();

    // Key exists in db, but data fields have changed so remove old key
    // This could also become a batch operation and would then be atomic
    if (this.id && this.id !== newId) {
      await NetworkGenealogy.delete(this.id);
    }
    this.id = newId;
  }

  generateID() {
    return this.sha3(
      JSON.stringify(this.ancestor) + JSON.stringify(this.descendant)
    );
  }
}

module.exports = NetworkGenealogy;
