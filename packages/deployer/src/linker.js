const sanitizeMessage = require("./sanitizeMessage");

module.exports = {
  link: async function (library, destinations, deployer) {
    let eventArgs;
    let libraryName = library.contractName;
    if (libraryName == null && library.constructor) {
      //allow for the possibility that library is an instance rather
      //than a class
      libraryName = library.constructor.contractName;
    }

    // Validate name (it might still be undefined)
    if (libraryName == null) {
      eventArgs = {
        type: "noLibName"
      };

      let message;
      if (deployer.options && deployer.options.events) {
        message = await deployer.options.events.emit(
          "deployment:error",
          eventArgs
        );
      }
      throw new Error(sanitizeMessage(message));
    }

    // Validate address: don't want to use .address directly because it will throw.
    let hasAddress;

    typeof library.isDeployed === "function"
      ? (hasAddress = library.isDeployed())
      : (hasAddress = library.address != null);

    if (!hasAddress) {
      eventArgs = {
        type: "noLibAddress",
        contract: library
      };

      let message;
      if (deployer.options && deployer.options.events) {
        message = await deployer.options.events.emit(
          "deployment:error",
          eventArgs
        );
      }
      throw new Error(sanitizeMessage(message));
    }
    // Link all destinations
    if (!Array.isArray(destinations)) {
      destinations = [destinations];
    }

    for (let destination of destinations) {
      // Don't link if result will have no effect.
      const alreadyLinked = destination.links[libraryName] === library.address;
      const noLinkage = !destination.unlinked_binary.includes(libraryName);

      if (alreadyLinked || noLinkage) continue;

      eventArgs = {
        libraryName,
        libraryAddress: library.address,
        contractName: destination.contractName,
        contractAddress: destination.contractAddress
      };

      if (deployer.options && deployer.options.events) {
        await deployer.options.events.emit("deployment:linking", eventArgs);
      }
      destination.link(library);
    }
  }
};
