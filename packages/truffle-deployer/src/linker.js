module.exports = {
  link: function(library, destinations, deployer) {

    if (!Array.isArray(destinations)) {
      destinations = [destinations];
    }

    if (library.contract_name == null) {
      deployer.emit('error', {
        type: 'noLibName'
      });
      throw new Error();
    }

    // Abstractions; don't want to use .address directly because it will throw.
    let hasAddress;

    (typeof library.isDeployed)
      ? hasAddress = library.isDeployed()
      : hasAddress = library.address != null;

    if (!hasAddress) {
      deployer.emit('error', {
        type: 'noLibAddress',
        contract: library
      });

      throw new Error();
    }

    destinations.forEach(function(destination) {
      // Don't link if result will have no effect.
      const alreadyLinked = (destination.links[library.contract_name] == library.address);
      const noLinkage =     (destination.unlinked_binary.indexOf(library.contract_name) < 0);

      if (alreadyLinked || noLinkage) return;

      deployer.emit('linking', {
        library: library,
        destination: destination
      });

      destination.link(library);
    });
  },
};
