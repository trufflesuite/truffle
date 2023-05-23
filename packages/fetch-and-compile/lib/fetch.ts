import debugModule from "debug";
const debug = debugModule("fetch-and-compile:fetch");
import semver from "semver";
import Fetchers from "@truffle/source-fetcher";
import {
  InvalidNetworkError,
  FetcherConstructor,
  Fetcher,
  SourceInfo
} from "@truffle/source-fetcher";
import Config from "@truffle/config";
const { Compile } = require("@truffle/compile-solidity"); //sorry for untyped import!
import type { Recognizer, FailureType, FetchAndCompileOptions } from "./types";
import type { WorkflowCompileResult } from "@truffle/compile-common";
import {
  normalizeFetchAndCompileOptions,
  normalizeFetcherNames
} from "./utils";

export async function fetchAndCompileForRecognizer(
  recognizer: Recognizer,
  options: FetchAndCompileOptions | Config
): Promise<void> {
  const normalizedOptions = normalizeFetchAndCompileOptions(options);
  const fetcherConstructors: FetcherConstructor[] =
    getSortedFetcherConstructors(normalizeFetcherNames(normalizedOptions));
  const fetchers = await getFetchers(
    fetcherConstructors,
    normalizedOptions,
    recognizer
  );
  //now: the main loop!
  let address: string | undefined;
  while ((address = recognizer.getAnUnrecognizedAddress()) !== undefined) {
    await tryFetchAndCompileAddress(
      address,
      fetchers,
      recognizer,
      normalizedOptions
    );
  }
}

//sort/filter fetchers by user's order, if given; otherwise use default order
export function getSortedFetcherConstructors(
  userFetcherNames?: string[]
): FetcherConstructor[] {
  let sortedFetchers: FetcherConstructor[] = [];
  if (userFetcherNames) {
    for (let name of userFetcherNames) {
      let Fetcher = Fetchers.find(Fetcher => Fetcher.fetcherName === name);
      if (Fetcher) {
        sortedFetchers.push(Fetcher);
      } else {
        throw new Error(`Unknown external source service ${name}.`);
      }
    }
  } else {
    sortedFetchers = Fetchers;
  }
  return sortedFetchers;
}

async function getFetchers(
  fetcherConstructors: FetcherConstructor[],
  options: FetchAndCompileOptions,
  recognizer: Recognizer
): Promise<Fetcher[]> {
  const networkId: number = options.network.networkId;
  //make fetcher instances. we'll filter out ones that don't support this
  //network (and note ones that yielded errors)
  return (
    await Promise.all(
      fetcherConstructors.map(async Fetcher => {
        try {
          return await Fetcher.forNetworkId(
            networkId,
            ((options.fetch || {}).fetcherOptions || {})[Fetcher.fetcherName]
          );
        } catch (error) {
          if (!(error instanceof InvalidNetworkError)) {
            //if it's *not* just an invalid network, log the error.
            recognizer.markBadFetcher(Fetcher.fetcherName);
          }
          //either way, filter this fetcher out
          return null;
        }
      })
    )
  ).filter((fetcher): fetcher is Fetcher => fetcher !== null);
}

async function tryFetchAndCompileAddress(
  address: string,
  fetchers: Fetcher[],
  recognizer: Recognizer,
  fetchAndCompileOptions: FetchAndCompileOptions
): Promise<void> {
  let found: boolean = false;
  let failureReason: FailureType | undefined; //undefined if no failure
  let failureError: Error | undefined;
  //(this includes if no source is found)
  for (const fetcher of fetchers) {
    //now comes all the hard parts!
    //get our sources
    let result: SourceInfo | null;
    try {
      debug("getting sources for %s via %s", address, fetcher.fetcherName);
      result = await fetcher.fetchSourcesForAddress(address);
    } catch (error) {
      debug("error in getting sources! %o", error);
      failureReason = "fetch";
      failureError = error;
      continue;
    }
    if (result === null) {
      debug("no sources found");
      //null means they don't have that address
      continue;
    }
    //if we do have it, extract sources & options
    debug("got sources!");
    const { sources, options } = result; //not same options as above, sorry for name confusion
    if (options.language === "Vyper") {
      //if it's not Solidity, bail out now
      debug("found Vyper, bailing out!");
      recognizer.markUnrecognizable(address, "language");
      //break out of the fetcher loop, since *no* fetcher will work here
      break;
    }
    //set up the config
    let externalConfig: Config = Config.default().with({
      compilers: {
        solc: {
          version: options.version,
          settings: options.settings
          //language and specializations don't go here
          //(the latter we won't use at all)
        }
      }
    });
    //if using docker, transform it (this does nothing if not using docker)
    externalConfig = transformIfUsingDocker(
      externalConfig,
      fetchAndCompileOptions
    );
    //compile the sources
    let compileResult: WorkflowCompileResult;
    try {
      compileResult = await Compile.sources({
        options: externalConfig.with({ quiet: true }),
        sources,
        language: options.language
      });
    } catch (error) {
      debug("compile error: %O", error);
      failureReason = "compile";
      failureError = error;
      continue; //try again with a different fetcher, I guess?
    }
    //add it!
    await recognizer.addCompiledInfo(
      {
        compileResult,
        sourceInfo: result,
        fetchedVia: fetcher.fetcherName
      },
      address
    );
    failureReason = undefined; //mark as *not* failed in case a previous fetcher failed
    failureError = undefined;
    //check: did this actually help?
    debug("checking result");
    if (!recognizer.isAddressUnrecognized(address)) {
      debug(
        "address %s successfully recognized via %s",
        address,
        fetcher.fetcherName
      );
      found = true;
      //break out of the fetcher loop -- we got what we want
      break;
    }
    debug("address %s still unrecognized", address);
  }
  if (found === false) {
    //if we couldn't find it, add it to the list of addresses to skip
    recognizer.markUnrecognizable(address, failureReason, failureError);
  }
}

function transformIfUsingDocker(
  externalConfig: Config,
  fetchAndCompileOptions: FetchAndCompileOptions
): Config {
  const useDocker = Boolean((fetchAndCompileOptions.compile || {}).docker);
  if (!useDocker) {
    //if they're not using docker, no need to transform anything :)
    return externalConfig;
  }
  const givenVersion: string = externalConfig.compilers.solc.version;
  //if they are, we have to ask: are they using a nightly?
  if (semver.prerelease(givenVersion)) {
    //we're not going to attempt to make Docker work with nightlies.
    //just keep Docker turned off.
    return externalConfig;
  }
  //otherwise, turn on Docker, and reduce the version to its simple form.
  const simpleVersion: string | null = semver.valid(givenVersion);
  if (simpleVersion === null) {
    //this should never happen
    throw new Error("Fetched source has unparseable compiler version");
  }
  return externalConfig.merge({
    compilers: {
      solc: {
        version: simpleVersion,
        docker: true
      }
    }
  });
}
