import debugModule from "debug";
const debug = debugModule("fetch-and-compile");
import type Config from "@truffle/config";
import { SingleRecognizer } from "./recognizer";
import { DebugRecognizer } from "./debug";
import { fetchAndCompileForRecognizer } from "./fetch";
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
