const Config = require("truffle-config");
const Web3 = require("web3");
const TruffleResolver = require("truffle-resolver");
const assert = require("assert");
const Ganache = require("ganache-core");
const ENS = require("../ens");
const path = require("path");
let ganacheOptions,
  config,
  options,
  server,
  ens,
  fromAddress,
  provider,
  workingDirectory,
  contractsBuildDirectory;

describe("ENS class", () => {
  beforeEach(done => {
    ganacheOptions = {
      mnemonic:
        "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
      total_accounts: 10,
      default_ether_balance: 100
    };
    workingDirectory = path.join(__dirname, "sources", "init");
    contractsBuildDirectory = path.join(workingDirectory, "build");
    config = Config.detect({
      working_directory: workingDirectory,
      contracts_build_directory: contractsBuildDirectory
    });
    server = Ganache.server(ganacheOptions);
    server.listen(8545, done);
    provider = new Web3.providers.HttpProvider("http://localhost:8545");
    options = {
      provider,
      resolver: new TruffleResolver(config)
    };
    ens = new ENS(options);
    fromAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
  });
  afterEach(done => {
    if (server) {
      server.close(() => {
        server = null;
        done();
      });
    }
  });

  describe("deployNewENSRegistry", () => {
    it("deploys a new registry and returns valid addresses", async () => {
      let {
        registryOwnerAddress,
        registryAddress
      } = await ens.deployNewENSRegistry(fromAddress);
      assert(Web3.utils.isAddress(registryOwnerAddress));
      assert(Web3.utils.isAddress(registryAddress));
    });
    it("returns addresses that are not 0x0", async () => {
      let {
        registryOwnerAddress,
        registryAddress
      } = await ens.deployNewENSRegistry(fromAddress);
      assert(registryAddress !== "0x0000000000000000000000000000000000000000");
      assert(
        registryOwnerAddress !== "0x0000000000000000000000000000000000000000"
      );
    });
  });
});
