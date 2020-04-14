const EthPMv1Source = require("./ethpm-v1");
const NPMSource = require("./npm");
const GlobalNPMSource = require("./globalnpm");
const FSSource = require("./fs");

module.exports = (options: any) => {
  return [
    new EthPMv1Source(
      options.working_directory,
      options.contracts_build_directory
    ),
    new NPMSource(options.working_directory),
    new GlobalNPMSource(),
    new FSSource(options.working_directory, options.contracts_build_directory)
  ];
};
