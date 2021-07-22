import debugModule from "debug";
const debug = debugModule("fetch-and-compile");
import type Config from "@truffle/config";
import * as Recognizers from "./recognizers";
import { fetchWithRecognizer } from "./fetch";
import type * as Types from "./types";

export { fetchWithRecognizer };

export async function fetchSingle(
  address: string,
  config: Config
): Promise<Types.SingleResult> {
  const recognizer = new Recognizers.SingleRecognizer(address);
  await fetchWithRecognizer(recognizer, config);
  return recognizer.getResult();
}

//note: this function is called primarily for its side-effects
//(i.e. adding compilations to the debugger), NOT its return value!
export async function fetchDebug(
  bugger: any, //sorry; this should be a debugger object
  config: Config
): Promise<Types.FetchExternalErrors> {
  const recognizer = new Recognizers.DebugRecognizer(bugger);
  await fetchWithRecognizer(recognizer, config);
  return recognizer.getErrors();
}
