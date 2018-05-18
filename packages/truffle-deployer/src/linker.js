module.exports = {
  link: function(library, destinations, logger) {
    const self = this;
    let hasAddress;

    logger = logger || console;

    if (!Array.isArray(destinations)) {
      destinations = [destinations];
    }

    if (library.contract_name == null) {
      throw new Error("Cannot link a library with no name.");
    }

    // Abstractions; don't want to use .address directly because it will throw.
    (typeof library.isDeployed)
      ? hasAddress = library.isDeployed()
      : hasAddress = library.address != null;

    if (!hasAddress) {
      throw new Error("Cannot link library: " + library.contract_name + " has no address. Has it been deployed?");
    }

    destinations.forEach(function(destination) {
      // Don't link if result will have no effect.
      if (destination.links[library.contract_name] == library.address) return;    // already linked to same address
      if (destination.unlinked_binary.indexOf(library.contract_name) < 0) return; // no linkage available

      logger.log("Linking " + library.contract_name + " to " + destination.contract_name);
      destination.link(library);
    });
  },
};
