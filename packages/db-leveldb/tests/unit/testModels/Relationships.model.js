const Model = require("../../../src/storage/Model");

class Relationship extends Model {
  contractIDs = {
    defaultValue: []
  };

  async addContractByID(id) {
    this.contractIDs.push(id);
  }

  async getContracts() {
    const { Contract } = Relationship.models;

    return Promise.all(
      this.contractIDs.map(async id => {
        return await Contract.get(id);
      })
    );
  }
}

module.exports = Relationship;
