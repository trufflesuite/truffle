const debug = require("debug")("deployer:ens");
const { getEnsAddress, default: ENSJS } = require("@ensdomains/ensjs");
const contract = require("@truffle/contract");
const { sha3 } = require("web3-utils");
const { hash } = require("eth-ens-namehash");

class ENS {
  constructor({ provider, networkId, ens }) {
    this.networkId = networkId;
    this.provider = provider;
    this.devRegistry = null;
    // we need a reference to the ens field to update it for @truffle/contract
    this.ens = ens;
  }

  determineENSRegistryAddress() {
    if (this.ens.registryAddress) {
      return this.ens.registryAddress;
    } else if (this.ensjs) {
      return this.ensjs.ens.address;
    } else {
      const message =
        `Truffle could not locate the address of the ENS ` +
        `registry for the network you are using. You must either be on a` +
        `known network or a development blockchain.`;
      throw new Error(message);
    }
  }

  async deployNewDevENSRegistry(from) {
    const ENSRegistryArtifact = require("./builtContracts/ENSRegistry");
    const ENSRegistry = contract(ENSRegistryArtifact);
    ENSRegistry.setProvider(this.provider);
    debug("deploying registry");
    const ensRegistry = await ENSRegistry.new({ from });
    debug("deployed");
    this.ens.registryAddress = ensRegistry.address;
    this.devRegistry = ensRegistry;
    this.setENSJS();
    debug("deploying reverse registrar");
    await this.deployNewDevReverseRegistrar(from);
    debug("deployed rr");
    return ensRegistry;
  }

  //this method should only be called when using a dev registry!
  //do not call it otherwise!
  async deployNewDevReverseRegistrar(from) {
    const registryAddress = this.determineENSRegistryAddress();
    debug("from: %s", from);
    debug("registryAddress: %s", registryAddress);
    const ReverseRegistrarArtifact = require("./builtContracts/ReverseRegistrar");
    const ReverseRegistrar = contract(ReverseRegistrarArtifact);
    ReverseRegistrar.setProvider(this.provider);
    //note: the resolver address we're supposed to pass in to the constructor
    //is supposed to be the "default resolver"; I'm not sure what that means,
    //but I figure using the resolver for "addr.reverse" ought to suffice,
    //right?  So let's set up a resolver for it.
    //but in order to set its resolver, we first have to set its owner.
    await this.setNameOwner({ from, name: "addr.reverse" });
    //now we can actually set the resolver
    const { resolverAddress } = await this.ensureResolverExists({
      from,
      name: "addr.reverse"
    });
    debug("resolver set: %s", resolverAddress);
    //...but wait!  we need it to be owned by the registry (or 0), not by us.
    //(otherwise the deployment will revert.)  so, let's hand over ownership to
    //the registry.
    await this.updateNameOwner({
      from,
      newOwner: registryAddress,
      name: "addr.reverse"
    });
    //now we can do the deployment!
    const reverseRegistrar = await ReverseRegistrar.new(
      registryAddress,
      resolverAddress,
      {
        from
      }
    );
    //except, we're not done... we need to transfer ownership from the registry
    //to the reverse registrar.
    //(if there were a previous reverse registrar, this would happen automatically,
    //but there wasn't, so it doesn't.)
    await this.updateNameOwner({
      from,
      newOwner: reverseRegistrar.address,
      name: "addr.reverse"
    });
    //and we're done!
  }

  async ensureResolverExists({ from, name }) {
    // See if the resolver is set, if not then set it
    const resolverAddress = await this.ensjs.name(name).getResolver();
    // names with no set resolver have 0x0 returned
    if (resolverAddress !== "0x0000000000000000000000000000000000000000") {
      const resolvedAddress = await this.ensjs.name(name).getAddress("ETH");
      return { resolvedAddress, resolverAddress };
    }
    // deploy a resolver if one isn't set
    const PublicResolverArtifact = require("./builtContracts/PublicResolver");
    const PublicResolver = contract(PublicResolverArtifact);
    PublicResolver.setProvider(this.provider);

    let registryAddress = this.determineENSRegistryAddress();

    const publicResolver = await PublicResolver.new(registryAddress, { from });
    await this.ensjs.name(name).setResolver(publicResolver.address, { from });
    return { resolvedAddress: null, resolverAddress: publicResolver.address };
  }

  async setAddress(name, addressOrContract, { from }) {
    this.validateSetAddressInputs({ addressOrContract, name, from });
    const address = this.parseAddress(addressOrContract);
    try {
      this.setENSJS();
    } catch (error) {
      if (error.message.includes("error instantiating the ENS")) {
        debug("deploying new dev registry");
        await this.deployNewDevENSRegistry(from);
        this.setENSJS();
      }
    }

    // In the case where there is a registry deployed by the user,
    // set permissions so that the resolver can be set by the user
    if (this.devRegistry) await this.setNameOwner({ from, name });

    // Find the owner of the name and compare it to the "from" field
    const nameOwner = await this.ensjs.name(name).getOwner();

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

    const { resolvedAddress } = await this.ensureResolverExists({ from, name });
    // If the resolver points to a different address or is not set,
    // then set it to the specified address
    debug("ensured resolver exists for %s", name);
    if (resolvedAddress !== address) {
      debug("setting address for %s to %s", name, address);
      await this.ensjs.name(name).setAddress("ETH", address);
      debug("address set");
    }
  }

  async setNameOwner({ name, from }) {
    const nameLabels = name.split(".").reverse();

    // Set top-level name
    let builtName = nameLabels[0];
    await this.devRegistry.setSubnodeOwner("0x0", sha3(builtName), from, {
      from
    });

    // If name is only one label, stop here
    if (nameLabels.length === 1) return;

    for (const label of nameLabels.slice(1)) {
      await this.devRegistry.setSubnodeOwner(
        hash(builtName),
        sha3(label),
        from,
        { from }
      );
      builtName = label.concat(`.${builtName}`);
    }
  }

  //this method assumes that from owns the parent!
  //it won't work otherwise!
  async updateNameOwner({ name, from, newOwner }) {
    //this method does *not* walk the tree.
    //it only updates this individual entry.

    let label, suffix;

    const dotIndex = name.indexOf("."); //find the first dot
    if (dotIndex !== -1) {
      label = name.slice(0, dotIndex); //everything before the dot
      suffix = name.slice(dotIndex + 1); //everything after the dot
    } else {
      label = name;
      suffix = "";
    }

    await this.devRegistry.setSubnodeOwner(
      suffix !== "" ? hash(suffix) : "0x0",
      sha3(label),
      newOwner,
      { from }
    );
  }

  parseAddress(addressOrContract) {
    if (typeof addressOrContract === "string") return addressOrContract;
    try {
      return addressOrContract.address;
    } catch (error) {
      const message =
        `You have not entered a valid address or contract ` +
        `object with an address property. Please ensure that you enter a ` +
        `valid address or pass in a valid artifact.`;
      throw new Error(message);
    }
  }

  validateSetAddressInputs({ addressOrContract, name, from }) {
    if (
      !addressOrContract ||
      !name ||
      !from ||
      (typeof addressOrContract !== "string" &&
        typeof addressOrContract !== "object") ||
      typeof name !== "string" ||
      typeof from !== "string"
    ) {
      const message =
        `The 'address', 'name', or 'from' parameter is invalid for ` +
        `the call to the setAddress function. Please ensure that you are ` +
        `passing valid values. The received input values were the ` +
        `following:\n   - address: ${addressOrContract}\n   - name: ${name}\n   - from: ` +
        `${from}\n`;
      throw new Error(message);
    }
  }

  setENSJS() {
    let ensAddress;
    try {
      ensAddress = this.ens.registryAddress || getEnsAddress(this.networkId);

      this.ensjs = new ENSJS({
        provider: this.provider,
        ensAddress
      });
    } catch (error) {
      const message =
        `There was an error instantiating the ENS library. ` +
        `Please ensure you have the correct ENS registry address. Truffle` +
        `is currently using ${ensAddress}.`;
      throw new Error(`${message} - ${error.message}`);
    }
  }
}

module.exports = ENS;
