const Model = require("../../../src/storage/Model");

class Virtual extends Model {
  firstName = {
    defaultValue: "First"
  };

  lastName = {
    defaultValue: "Last"
  };

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  set fullName(fullName) {
    if (fullName.indexOf(" ") >= 0) {
      const name = fullName.split(" ");
      this.firstName = name[0];
      this.lastName = name[1];
    }
  }
}

module.exports = Virtual;
