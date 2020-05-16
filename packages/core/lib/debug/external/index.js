const debugModule = require("debug");
const debug = debugModule("lib:debug:external");

const Web3 = require("web3");
const temp = require("temp").track();
const fs = require("fs-extra");
const path = require("path");

const Debugger = require("@truffle/debugger");
const Codec = require("@truffle/codec");

const { DebugCompiler } = require("./compiler");

const { EtherscanFetcher } = require("./etherscan");
const Fetchers = [EtherscanFetcher];

class DebugExternalHandler {
  constructor(config, compilations, txHash) {
    this.config = config;
    this.compilations = compilations;
    this.txHash = txHash;
  }

  async getAllCompilations() {
    let finalCompilations = Object.assign({}, compilations);
    let failures = [];
    //spin up a light-mode debugger
    const bugger = await Debugger.forTx(txHash, {
      provider: config.provider,
      compilations,
      lightMode: true
    });
    //get the unrecognized addresses from it
    const instances = bugger.view(
      Debugger.selectors.session.info.affectedInstances
    );
    let unknownAddresses = new Set(
      Object.entries(instances)
        .filter(([_, { contractName }]) => contractName === undefined)
        .map(([address, _]) => address)
    );
    //(we can now discard the initial debugger; yay garbage collection)
    //get the network id
    const networkId = await new Web3(config.provider).eth.net.getId(); //note: this is a number
    //make fetcher instances
    const fetchers = Fetchers.map(Fetcher => new Fetcher(networkId));
    for (const fetcher of fetchers) {
      //skip ones that don't support this network
      if (!fetcher.isNetworkValid()) {
        continue;
      }
      const addresses = new Set(unknownAddresses); //make copy for iterating over,
      //since we'll want to delete things from unknownAddresses
      for (const address of addresses) {
        if (fetcher.hasAddress(address)) {
          //now comes all the hard parts!
          //get our sources
          let sources;
          try {
            sources = fetcher.fetchSourcesForAddress(address);
          } catch (_) {
            failures.push(address);
            continue;
          }
          //make a temporary directory to store our downloads in
          const sourceDirectory = temp.mkdirSync("tmp-");
          //save the sources to the temporary directory
          await Promise.all(
            Object.entries(sources).map(async ([sourcePath, source]) => {
              const temporaryPath = path.join(sourceDirectory, sourcePath);
              await fs.outputFile(temporaryPath, source);
            })
          );
          //compile the sources
          const temporaryConfig = config.with({
            contracts_directory: sourceDirectory
          });
          const { contracts, sourceIndexes: files } = await new DebugCompiler(
            temporaryConfig
          ).compile();
          //shim the result
          const compilationId = `externalFor${address}`;
          const newCompilations = Codec.Compilations.Utils.shimArtifacts(
            contracts,
            files,
            compilationId
          );
          //assign it!
          Object.assign(finalCompilations, newCompilations); //mutates!
          //finally, this address is no longer unknown, so later fetchers can ignore it
          unknownAddresses.delete(address);
        }
      }
    }
    return { compilations: finalCompilations, failures };
  }
}

module.exports = {
  DebugExternalHandler
};
