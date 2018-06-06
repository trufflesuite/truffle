module.exports = {
  link: function(library, destinations, deployer) {
    let eventArgs;

    // Validate name
    if (library.contract_name == null) {
      eventArgs = {
        type: 'noLibName'
      }

      deployer.emitter.emit('error', eventArgs);
      throw new Error(); // <-- Handle this
    }

    // Validate address: don't want to use .address directly because it will throw.
    let hasAddress;

    (typeof library.isDeployed)
      ? hasAddress = library.isDeployed()
      : hasAddress = library.address != null;

    if (!hasAddress) {
      eventArgs = {
        type: 'noLibAddress',
        contract: library,
      }

      deployer.emitter.emit('error', eventArgs);
      throw new Error(); // <-- Handle this
    }

    // Link all destinations
    if (!Array.isArray(destinations)) {
      destinations = [destinations];
    }

    for (let destination of destinations) {
      // Don't link if result will have no effect.
      const alreadyLinked = (destination.links[library.contract_name] == library.address);
      const noLinkage =     (destination.unlinked_binary.indexOf(library.contract_name) < 0);

      if (alreadyLinked || noLinkage) return;

      eventArgs = {
        libraryName: library.contractName,
        libraryAddress: library.address,
        contractName: destination.contractName,
        contractAddress: destination.contractAddress,
      }

      deployer.emitter.emit('linking', eventArgs);
      destination.link(library);
    };
  },
};
