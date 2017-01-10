var Linker = require("../linker");

module.exports = function(library, destinations, deployer) {
  return function() {
    Linker.link(library, destinations, deployer.logger);
  };
};
