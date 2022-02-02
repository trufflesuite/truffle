const Model = require("../../../src/storage/Model");

class Project extends Model {
  name = {
    defaultValue: "Default Value",
    required: true,
    validation: name => {
      return typeof name === "string";
    }
  };
  requiredField = {
    defaultValue: "required",
    required: true
  };
  requiredNoDefault = {
    required: true
  };
  directory;

  someFunction() {}
}

module.exports = Project;
