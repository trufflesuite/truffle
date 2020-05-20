const debugModule = require("debug");
const debug = debugModule("lib:debug:external");

const Web3 = require("web3");
const temp = require("temp").track();
const fs = require("fs-extra");
const path = require("path");

const Codec = require("@truffle/codec");
const Fetchers = require("@truffle/source-fetcher");

const { DebugCompiler } = require("./compiler");

class DebugExternalHandler {
  constructor(bugger, config) {
    this.config = config;
    this.bugger = bugger;
  }

  async fetch() {
    let badAddresses = []; //for reporting errors back
    let badFetchers = []; //similar
    let addressesToSkip = new Set(); //addresses we know we can't get source for
    //note: this should always be a subset of unknownAddresses! [see below]
    //get the network id
    const networkId = await new Web3(config.provider).eth.net.getId(); //note: this is a number
    //make fetcher instances
    const allFetchers = Fetchers.map(Fetcher =>
      Fetcher.forNetworkId(networkId)
    );
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
    while (
      (address = getAnUnknownAddress(this.bugger, addressesToSkip)) !==
      undefined
    ) {
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
          let sources, options;
          try {
            ({ sources, options } = fetcher.fetchSourcesForAddress(address));
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
            contracts_directory: sourceDirectory,
            compilers: {
              solc: options
            }
          });
          const { contracts, sourceIndexes: files } = await new DebugCompiler(
            temporaryConfig
          ).compile();
          //shim the result
          const compilationId = `externalFor${address}Via${fetcher.name}`;
          const newCompilations = Codec.Compilations.Utils.shimArtifacts(
            contracts,
            files,
            compilationId
          );
          //add it!
          await this.bugger.addCompilations(newCompilations);
          //check: did this actually help?
          if (!getUnknownAddresses(this.bugger).includes(address)) {
            found = true;
            //break out of the fetcher loop -- we got what we want
            break;
          }
        }
      }
      if (found === false) {
        //if we couldn't find it, add it to the list of addresses to skip
        addressesToSkip.add(address);
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

function getUnknownAddresses(bugger) {
  const instances = bugger.view(
    bugger.selectors.session.info.affectedInstances
  );
  return Object.entries(instances)
    .filter(([_, { contractName }]) => contractName === undefined)
    .map(([address, _]) => address);
}

function getAnUnknownAddress(bugger, addressesToSkip) {
  return getUnknownAddresses(bugger).find(
    address => !addressesToSkip.has(address)
  );
}

module.exports = {
  DebugExternalHandler
};
