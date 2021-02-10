const debug = require("debug")("lib:commands:db:commands:fetch:fetchSources");

const { Compile } = require("@truffle/compile-solidity");
const Fetchers = require("@truffle/source-fetcher").default;

async function fetchSources(config, address) {
  const badFetchers = []; //similar
  const addressesToSkip = new Set(); //addresses we know we can't get source for

  //note: this should always be a subset of unknownAddresses! [see below]
  const networkId = parseInt(config.network_id);
  //make fetcher instances
  debug("Fetchers: %o", Fetchers);
  const allFetchers = await Promise.all(
    Fetchers.map(
      async Fetcher =>
        await Fetcher.forNetworkId(networkId, config[Fetcher.fetcherName])
    )
  );
  const userFetcherNames = config.sourceFetchers;
  //sort/filter fetchers by user's order, if given; otherwise use default order
  let sortedFetchers = [];
  if (userFetcherNames) {
    for (let name of userFetcherNames) {
      let Fetcher = allFetchers.find(Fetcher => Fetcher.fetcherName === name);
      if (Fetcher) {
        sortedFetchers.push(Fetcher);
      } else {
        throw new Error(`Unknown external source service ${name}.`);
      }
    }
  } else {
    sortedFetchers = allFetchers;
  }

  //to get the final list, we'll filter out ones that don't support this
  //network (and note ones that yielded errors)
  const fetchers = sortedFetchers;

  //(not set if there is no source)
  for (const fetcher of fetchers) {
    //now comes all the hard parts!
    //get our sources
    let result;
    try {
      debug("getting sources for %s via %s", address, fetcher.fetcherName);
      result = await fetcher.fetchSourcesForAddress(address);
    } catch (error) {
      debug("error in getting sources! %o", error);
      continue;
    }
    if (result === null) {
      debug("no sources found");
      //null means they don't have that address
      continue;
    }
    //if we do have it, extract sources & options
    debug("got sources!");
    const { contractName, sources, options } = result;
    if (options.language !== "Solidity") {
      //if it's not Solidity, bail out now
      debug("not Solidity, bailing out!");
      addressesToSkip.add(address);
      //break out of the fetcher loop, since *no* fetcher will work here
      break;
    }

    //compile the sources
    const externalConfig = config.with({
      compilers: {
        solc: options
      }
    });

    return {
      contractName,
      result: await Compile.sources({
        options: externalConfig,
        sources
      })
    };
  }

  debug("unable to find");
}

module.exports = { fetchSources };
