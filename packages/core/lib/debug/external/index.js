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
    let allCompilations = Object.assign({}, compilations);
    let badAddresses = []; //for reporting errors back
    let badFetchers = []; //similar
    let sourcelessAddresses = new Set(); //addresses we know we can't get source for
    //note: this should always be a subset of unknownAddresses! [see below]
    //get the network id
    const networkId = await new Web3(config.provider).eth.net.getId(); //note: this is a number
    //make fetcher instances
    const allFetchers = Fetchers.map(Fetcher => new Fetcher(networkId));
    let fetchers;
    //filter out ones that don't support this network
    //(and note ones that yielded errors)
    for (const fetcher of allFetchers) {
      let isValid;
      let failure = false;
      try {
        isValid = fetcher.isNetworkValid();
      } catch (_) {
        isValid = false;
        failure = true;
      }
      if (isValid) {
        fetchers.push(fetcher);
      }
      if (failure) {
        badFetchers.push(fetcher.name);
      }
    }
    //now: the main loop!
    while (true) {
      //spin up a light-mode debugger
      const bugger = await Debugger.forTx(txHash, {
        provider: config.provider,
        allCompilations, //note we use *all* compilations made so far!
        lightMode: true
      });
      //get the unrecognized addresses from it
      const instances = bugger.view(
        Debugger.selectors.session.info.affectedInstances
      );
      const unknownAddresses = Object.entries(instances)
        .filter(([_, { contractName }]) => contractName === undefined)
        .map(([address, _]) => address);
      //(we can now discard the debugger; yay garbage collection)
      //now: are there any unknown addresses we can maybe find source for?
      const address = unknownAddresses.find(
        address => !sourcelessAddresses.has(address)
      );
      //if not, the loop is done
      if (address === undefined) {
        break;
      }
      //otherwise, let's go try to fetch source for that address
      let found = false;
      let failure = false; //set in case something goes wrong while getting source
      //(not set if there is no source)
      for (const fetcher of fetchers) {
        let hasAddress;
        try {
          hasAddress = fetcher.hasAddress(address);
        } catch (_) {
          failure = true;
          continue;
        }
        if (hasAddress) {
          //now comes all the hard parts!
          //get our sources
          let sources;
          try {
            sources = fetcher.fetchSourcesForAddress(address);
          } catch (_) {
            failure = true;
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
          Object.assign(allCompilations, newCompilations); //mutates!
          //break out of the fetcher loop -- we got what we want
          found = true;
          break;
        }
      }
      if (found === false) {
        //if we couldn't find it, add it to the list of sourceless addresses
        sourcelessAddresses.add(address);
        //if we couldn't find it *and* there was a network problem, add it to
        //the failures list
        if (failure === true) {
          badAddresses.push(address);
        }
      }
    }
    return { compilations: allCompilations, badAddresses, badFetchers };
  }
}

module.exports = {
  DebugExternalHandler
};
