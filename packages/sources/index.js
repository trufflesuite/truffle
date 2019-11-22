const expect = require("@truffle/expect");
const EPMSource = require("./epm");
const NPMSource = require("./npm");
const GlobalNPMSource = require("./globalnpm");
const FSSource = require("./fs");

module.exports = (options) => {
  expect.options(options, ["working_directory", "contracts_build_directory"]);

  return [
    new EPMSource(options.working_directory, options.contracts_build_directory),
    new NPMSource(options.working_directory),
    new GlobalNPMSource(),
    new FSSource(options.working_directory, options.contracts_build_directory)
  ];
}
