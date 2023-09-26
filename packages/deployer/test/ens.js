const { Web3 } = require("web3");
const { sha3 } = Web3.utils;
const assert = require("assert");
const Ganache = require("ganache");
const ENS = require("../ens");
const Deployer = require("..");
const Config = require("@truffle/config");
const sinon = require("sinon");
const ENSJS = require("@ensdomains/ensjs").default;

let providerOptions,
  options,
  ens,
  fromAddress,
  provider,
  addressToSet,
  registryAddress,
  ensjs,
  registry;

describe("ENS class", () => {
  before(() => {
    providerOptions = {
      // note that when vmErrorsOnRPCResponse is true, `"eager"` instamine must be enabled (default)
      vmErrorsOnRPCResponse: true,
      mnemonic:
        "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
      total_accounts: 1,
      default_ether_balance: 100,
      logging: { quiet: true }
    };
    provider = Ganache.provider(providerOptions);
  });
  after(async () => {
    if (provider) {
      await provider.disconnect();
      provider = null;
    }
  });
  beforeEach(async () => {
    options = {
      provider,
      ens: {
        enabled: true
      }
    };
    ens = new ENS(options);
    // First address generated from the above mnemonic
    fromAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
  });

  describe("deployNewDevENSRegistry", () => {
    it("deploys a new registry and returns the registry object", async () => {
      const result = await ens.deployNewDevENSRegistry(fromAddress);
      assert(Web3.utils.isAddress(result.address));
    });
    it("deploys a new registry which has a non-0x0 address", async () => {
      const result = await ens.deployNewDevENSRegistry(fromAddress);
      assert.notEqual(
        result.address,
        "0x0000000000000000000000000000000000000000"
      );
    });
    it("deploys a reverse registrar and hooks it up", async () => {
      const registryAddress = await ens.deployNewDevENSRegistry(fromAddress);
      const reverseRegistrar = await ens.ensjs.name("addr.reverse").getOwner();
      assert.notEqual(
        reverseRegistrar,
        "0x0000000000000000000000000000000000000000",
        "no reverse registrar hooked up"
      );
      assert.notEqual(
        reverseRegistrar,
        fromAddress,
        "EOA got set as reverse registrar"
      );
      assert.notEqual(
        reverseRegistrar,
        registryAddress,
        "Registry got set as its own reverse registrar??"
      );
    });
    it("deploys a reverse registrar and allows setting reverse records", async () => {
      const name = "myname.eth";
      await ens.deployNewDevENSRegistry(fromAddress);
      await ens.ensjs.setReverseRecord(name); //set reverse record for fromAddress
      const retrievedName = (await ens.ensjs.getName(fromAddress)).name;
      assert.equal(retrievedName, name);
    });
  });

  describe("setAddress(name, addressOrContract, from)", () => {
    describe("when there is no registry deployed", () => {
      beforeEach(() => {
        sinon.spy(ens, "deployNewDevENSRegistry");
        addressToSet = "0x1234567890123456789012345678901234567890";
      });
      afterEach(() => {
        ens.deployNewDevENSRegistry.restore();
      });

      it("calls deployNewDevENSRegistry", async () => {
        await ens.setAddress("namezzz", addressToSet, { from: fromAddress });
        assert(ens.deployNewDevENSRegistry.called);
      });
    });
    describe("when there is a registry deployed", () => {
      beforeEach(async () => {
        registry = await ens.deployNewDevENSRegistry(fromAddress);
        registryAddress = registry.address;
        addressToSet = "0x1234567890123456789012345678901234567890";
      });

      describe("when the name is not owned by the from address", async () => {
        it("errors when the name is not owned by the from address", async () => {
          try {
            await ens.setAddress("namezzz", addressToSet, {
              from: fromAddress
            });
          } catch (error) {
            const expectedMessageSnippet = `The default address or address provided in the "from"`;
            assert(error.message.includes(expectedMessageSnippet));
          }
        });
      });

      describe("when the name is owned by the from address", async () => {
        beforeEach(async () => {
          const ZERO_NODE =
            "0x0000000000000000000000000000000000000000000000000000000000000000";
          const registryOwnerAddress = await registry.owner(ZERO_NODE);
          addressToSet = "0x1234567890123456789012345678901234567890";
          await registry.setSubnodeOwner(
            ZERO_NODE,
            sha3("namezzz"),
            registryOwnerAddress,
            { from: registryOwnerAddress }
          );
          ensjs = new ENSJS({
            provider,
            ensAddress: registryAddress
          });
        });

        it("sets the resolver to resolve to the proper address", async () => {
          await ens.setAddress("namezzz", addressToSet, { from: fromAddress });
          let resolvedAddress = await ensjs.name("namezzz").getAddress();
          assert(resolvedAddress === addressToSet);
        });
      });
    });
  });

  describe("setNameOwner({ name, from })", () => {
    beforeEach(async () => {
      const registry = await ens.deployNewDevENSRegistry(fromAddress);
      ensjs = new ENSJS({
        provider,
        ensAddress: registry.address
      });
    });

    it("sets the owner of the given domain name", async () => {
      await ens.setNameOwner({ from: fromAddress, name: "my.test.name" });
      const owner = await ensjs.name("my.test.name").getOwner();
      assert(owner === fromAddress);
    });
    it("sets the owner for the intermediary names as well", async () => {
      await ens.setNameOwner({ from: fromAddress, name: "my.test.name" });
      const owner1 = await ensjs.name("name").getOwner();
      const owner2 = await ensjs.name("test.name").getOwner();
      assert(owner1 === fromAddress && owner1 === owner2);
    });
  });

  describe("User-specified registries", function () {
    it("Allows user-set registry address in any of the valid places", function () {
      const registryAddress = "0x0123456789012345678901234567890123456789";
      let config = Config.default().merge({
        ens: {
          enabled: true,
          registryAddress
        },
        networks: {
          myNetwork: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*"
          }
        },
        network: "myNetwork"
      });
      let deployer = new Deployer(config);
      assert.equal(deployer.ens.ens.registryAddress, registryAddress);
      config = Config.default().merge({
        ens: {
          enabled: true,
          registry: {
            address: registryAddress
          }
        },
        networks: {
          myNetwork: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*"
          }
        },
        network: "myNetwork"
      });
      deployer = new Deployer(config);
      assert.equal(deployer.ens.ens.registryAddress, registryAddress);
      config = Config.default().merge({
        ens: {
          enabled: true
        },
        networks: {
          myNetwork: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*",
            registryAddress
          }
        },
        network: "myNetwork"
      });
      deployer = new Deployer(config);
      assert.equal(deployer.ens.ens.registryAddress, registryAddress);
      config = Config.default().merge({
        ens: {
          enabled: true
        },
        networks: {
          myNetwork: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*",
            registry: {
              address: registryAddress
            }
          }
        },
        network: "myNetwork"
      });
      deployer = new Deployer(config);
      assert.equal(deployer.ens.ens.registryAddress, registryAddress);
      assert.equal(deployer.ens.ens.registryAddress, registryAddress);
      config = Config.default().merge({
        ens: {
          enabled: true
        },
        networks: {
          myNetwork: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*",
            ens: {
              registry: {
                address: registryAddress
              }
            }
          }
        },
        network: "myNetwork"
      });
      deployer = new Deployer(config);
      assert.equal(deployer.ens.ens.registryAddress, registryAddress);
    });

    it("Prefers network-specific registries", function () {
      const registryAddress = "0x0123456789012345678901234567890123456789";
      const fakeRegistryAddress = "0x9876543210987654321098765432109876543210";
      const config = Config.default().merge({
        ens: {
          enabled: true,
          registryAddress: fakeRegistryAddress
        },
        networks: {
          myNetwork: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*",
            registryAddress
          }
        },
        network: "myNetwork"
      });
      const deployer = new Deployer(config);
      assert.equal(deployer.ens.ens.registryAddress, registryAddress);
    });
  });
});
