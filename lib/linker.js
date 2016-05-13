module.exports = {
  link: function(library, destinations, logger) {
    var self = this;

    logger = logger || console;

    if (!Array.isArray(destinations)) {
      destinations = [destinations];
    }

    var regex = new RegExp("__" + library.contract_name + "_*", "g");

    if (library.contract_name == null) {
      throw new Error("Cannot link a library with no name.");
    }

    if (library.address == null) {
      throw new Error("Cannot link library: " + library.contract_name + " has no address.");
    }

    destinations.forEach(function(destination) {
      logger.log("Linking " + library.contract_name + " to " + destination.contract_name);
      destination.binary = destination.unlinked_binary.replace(regex, library.address);
    });
  },

  autolink: function(contract, available_contracts, logger) {
    var self = this;
    var regex = /__[^_]+_+/g;

    logger = logger || console;

    var unlinked_libraries = contract.unlinked_binary.match(regex);

    if (unlinked_libraries.length == 0) {
      throw new Error("Cannot auto link " + contract.contract_name + "; " + contract.contract_name + " has no library dependencies.")
    }

    unlinked_libraries = unlinked_libraries.map(function(name) {
      // Remove underscores
      return name.replace(/_/g, "");
    }).sort().filter(function(name, index, arr) {
      // Remove duplicates
      if (index + 1 >= arr.length) {
        return true;
      }

      return name != arr[index + 1];
    });

    unlinked_libraries.forEach(function(name) {
      var library = available_contracts[name];

      if (library == null) {
        throw new Error("Cannot auto link " + contract.contract_name + "; " + contract.contract_name + " unknown dependency " + name + ".")
      }

      self.link(library, contract, logger);
    });
  }
};
