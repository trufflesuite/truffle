import debugModule from "debug";
const debug = debugModule("fetch-and-compile");
import type Config from "@truffle/config";
import { SingleRecognizer } from "./recognizer";
import { MultipleRecognizer } from "./multiple";
import { DebugRecognizer } from "./debug";
import {
  fetchAndCompileForRecognizer,
  getSortedFetcherConstructors
} from "./fetch";
import type * as Types from "./types";

export { fetchAndCompileForRecognizer };

export async function fetchAndCompile(
  address: string,
  config: Config
): Promise<Types.FetchAndCompileResult> {
  const recognizer = new SingleRecognizer(address);
  await fetchAndCompileForRecognizer(recognizer, config);
  return recognizer.getResult();
}

/**
 * warning: while this function deduplicates inputs,
 * it does *not* make any further effort to avoid redundant
 * fetches (e.g. if multiple addresses share the same source),
 * unlike fetchAndCompileForDebugger
 */
export async function fetchAndCompileMultiple(
  addresses: string[],
  config: Config
): Promise<Types.FetchAndCompileMultipleResult> {
  const recognizer = new MultipleRecognizer(addresses);
  await fetchAndCompileForRecognizer(recognizer, config);
  return recognizer.getResults();
}

//note: this function is called primarily for its side-effects
//(i.e. adding compilations to the debugger), NOT its return value!
export async function fetchAndCompileForDebugger(
  bugger: any, //sorry; this should be a debugger object
  config: Config
): Promise<Types.FetchExternalErrors> {
  const recognizer = new DebugRecognizer(bugger);
  await fetchAndCompileForRecognizer(recognizer, config);
  return recognizer.getErrors();
}

export function getSupportedNetworks(config?: Config): Types.SupportedNetworks {
  const fetchers = getSortedFetcherConstructors(config);
  //strictly speaking these are fetcher constructors, but since we
  //won't be using fetcher instances in this function, I'm not going
  //to worry about the difference
  let supportedNetworks: Types.SupportedNetworks = {};
  for (const fetcher of fetchers) {
    const fetcherNetworks = fetcher.getSupportedNetworks();
    for (const name in fetcherNetworks) {
      if (name in supportedNetworks) {
        supportedNetworks[name].fetchers.push(fetcher.fetcherName);
      } else {
        supportedNetworks[name] = {
          ...fetcherNetworks[name],
          fetchers: [fetcher.fetcherName]
        };
      }
    }
  }
  return supportedNetworks;
}
