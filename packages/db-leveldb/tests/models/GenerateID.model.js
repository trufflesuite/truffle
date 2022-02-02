const Model = require("../../src/storage/Model");
const { soliditySha3 } = require("web3-utils");

class GenerateID extends Model {
  fieldA = {
    defaultValue: "fieldA",
    required: true
  };
  fieldB = {
    defaultValue: "fieldB",
    required: true
  };
  fieldC = {
    defaultValue: "fieldC",
    required: true
  };

  async beforeSave() {
    const newId = this.generateID();

    // Key exists in db, but data fields have changed so remove old key
    // This could also become a batch operation and would then be atomic
    if (this.id && this.id !== newId) {
      await GenerateID.delete(this.id);
    }
    this.id = newId;
  }

  generateID() {
    return soliditySha3(this.fieldA + this.fieldB + this.fieldC);
  }
}

module.exports = GenerateID;
