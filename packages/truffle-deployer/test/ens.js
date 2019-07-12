const Web3 = require("web3");
const { sha3 } = Web3.utils;
const assert = require("assert");
const Ganache = require("ganache-core");
const ENS = require("../ens");
const sinon = require("sinon");
const HDWalletProvider = require("truffle-hdwallet-provider");
const ENSJS = require("ethereum-ens");

let ganacheOptions,
  options,
  server,
  ens,
  fromAddress,
  provider,
  addressToSet,
  registryAddress;

describe("ENS class", () => {
  before(() => {
    ganacheOptions = {
      mnemonic:
        "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
      total_accounts: 1,
      default_ether_balance: 100
    };
    server = Ganache.server(ganacheOptions);
    server.listen(8545, () => {});
  });
  after(done => {
    if (server) {
      server.close(() => {
        server = null;
        done();
      });
    }
  });
  beforeEach(() => {
    provider = new HDWalletProvider(
      ganacheOptions.mnemonic,
      "http://localhost:8545"
    );
    options = {
      provider,
      ensSettings: { enabled: true }
    };
    ens = new ENS(options);
    fromAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
  });

  describe("deployNewDevENSRegistry", () => {
    it("deploys a new registry and returns the registry object", async () => {
      let result = await ens.deployNewDevENSRegistry(fromAddress);
      assert(Web3.utils.isAddress(result.address));
    });
    it("deploys a new registry which has a non-0x0 address", async () => {
      let result = await ens.deployNewDevENSRegistry(fromAddress);
      assert(result.address !== "0x0000000000000000000000000000000000000000");
    });
  });

  describe("register(address, name, from)", () => {
    describe("when there is no registry deployed", () => {
      beforeEach(() => {
        sinon.spy(ens, "deployNewDevENSRegistry");
        addressToSet = "0x1234567890123456789012345678901234567890";
      });
      afterEach(() => {
        ens.deployNewDevENSRegistry.restore();
      });

      it("calls deployNewDevENSRegistry", async () => {
        await ens.setAddress({
          address: addressToSet,
          name: "namezzz",
          from: fromAddress
        });
        assert(ens.deployNewDevENSRegistry.called);
      });
    });
    describe("when there is a registry deployed", () => {
      beforeEach(async () => {
        let result = await ens.deployNewDevENSRegistry(fromAddress);
        registryAddress = result.address;
        addressToSet = "0x1234567890123456789012345678901234567890";
      });

      describe("when the name is not owned by the from address", async () => {
        it("errors when the name is not owned by the from address", async () => {
          try {
            await ens.setAddress({
              address: addressToSet,
              name: "namezzz",
              from: fromAddress,
              registryAddress
            });
          } catch (error) {
            const expectedMessageSnippet = `The default address or address provided in the "from"`;
            assert(error.message.includes(expectedMessageSnippet));
          }
        });
      });

      describe("when the name is owned by the from address", async () => {
        beforeEach(async () => {
          let registry = await ens.deployNewDevENSRegistry(fromAddress);
          registryOwnerAddress = await registry.owner("0x0");
          registryAddress = registry.address;
          addressToSet = "0x1234567890123456789012345678901234567890";
          await registry.setSubnodeOwner(
            "0x0",
            sha3("namezzz"),
            registryOwnerAddress,
            { from: registryOwnerAddress }
          );
          ensjs = new ENSJS(provider, registryAddress);
        });

        it("sets the resolver to resolve to the proper address", async () => {
          await ens.setAddress({
            address: addressToSet,
            name: "namezzz",
            from: fromAddress,
            registryAddress
          });
          let resolvedAddress = await ensjs.resolver("namezzz").addr();
          assert(resolvedAddress === addressToSet);
        });
      });
    });
  });
});
