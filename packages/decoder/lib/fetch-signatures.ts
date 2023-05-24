import debugModule from "debug";
const debug = debugModule("decoder:fetch-signatures");

export async function fetchSignatures(selector: Uint8Array): Promise<string[]> {
  debug("selector: %O", selector);
  return []; //TODO
}
