import debugModule from "debug";
const debug = debugModule("decoder:fetch-signatures");

import axios from "axios";
import retry from "async-retry";

import { Conversion } from "@truffle/codec";

interface DirectoryResponse {
  next: string | null;
  previous: string | null;
  count: number;
  results: DirectoryEntry[];
}

interface DirectoryEntry {
  id: number;
  created_at: string;
  text_signature: string;
  hex_signature: string; //the only part we care about!
  bytes_signature: string;
}

export async function fetchSignatures(
  selector: Uint8Array, //note: input should be 4 bytes long
  url: string
): Promise<string[]> {
  const selectorString = Conversion.toHexString(selector);
  let page: number = 1;
  let signatures: string[] = [];
  while (true) {
    const response = await getSuccessfulResponse(selectorString, url, page);
    signatures = signatures.concat(
      response.results.map(({ text_signature }) => text_signature)
    ); //append new signatures
    if (response.next === null) {
      break;
    }
    page++; //ideally we'd use the actual value of response.next, but this is easier
  }
  return signatures;
}

async function getSuccessfulResponse(
  selector: string,
  url: string,
  page: number
): Promise<DirectoryResponse> {
  return await retry(
    async () =>
      (
        await axios.get(`${url}/v1/signatures/`, {
          params: {
            hex_signature: selector,
            page
          },
          responseType: "json",
          maxRedirects: 50
        })
      ).data,
    { retries: 3 } //we'll leave minTimeout as the default 1000
  );
}
