var Linker = require("../linker");

module.exports = function(library, destinations, deployer) {
  return async function() {
    await Linker.link(library, destinations, deployer);
  };
};
