const EPMSource = require("./epm");
const NPMSource = require("./npm");
const GlobalNPMSource = require("./globalnpm");
const FSSource = require("./fs");
const TestSource = require("./TestSource");

module.exports = (options, findContracts) => {
  return [
    new EPMSource(options.working_directory, options.contracts_build_directory),
    new NPMSource(options.working_directory),
    new GlobalNPMSource(),
    new FSSource(options.working_directory, options.contracts_build_directory),
    new TestSource(options, findContracts)
  ]
}
