const ENSJS = require("ethereum-ens");

class ENS {
  constructor({ provider, resolver }) {
    this.provider = provider;
    this.resolver = resolver;
  }

  async deployNewENSRegistry() {
    const ENS = this.resolver.require("@ensdomains/ens/ENSRegistry");
    const ens = await ENS.new();
    const ensOwnerAddress = await ens.owner("0x0");

    return {
      ensOwnerAddress,
      ensRegistryAddress: ens.address
    };
  }

  async register(address, name, from) {
    const ensjs = new ENSJS(provider);

    // Find the owner of the name and compare it to the "from" field let nameOwner = await ensjs.owner(name);
    let nameOwner = await ensjs.owner(name);
    // Handle case where there is no owner and we try to register it for the user
    // if (nameOwner === "0x0000000000000000000000000000000000000000") {
    //   this.attemptNameRegistration();
    // }
    if (nameOwner !== from) {
      const message =
        `The default address or address provided in the "from" ` +
        `field for registering does not own the specified ENS name. The ` +
        `"from" field address must match the owner of the name.` +
        `\n> Failed to register ENS name ${name}` +
        `\n> Address in "from" field - ${from}` +
        `\n> Current owner of '${name}' - ${nameOwner}`;
      throw new Error(message);
    }

    // See if the resolver is set, if not then set it
    let resolverAddress;
    try {
      resolverAddress = await ensjs.resolver(name);
    } catch (error) {
      if (error.message !== "ENS name not found") throw error;
      resolverAddress = null;
    }
    if (resolverAddress !== address) {
      return await ensjs.setResolver(name, address, { from });
    }
  }
}

module.exports = ENS;
