import { asyncLast } from "iter-tools";
import CID from "cids";
const IpfsHttpClient: any = require("ipfs-http-client");

import * as Preserve from "@truffle/preserve";

import { FileObject, IpfsClient } from "./adapter";

export interface PreserveToIpfsOptions {
  target: Preserve.Target;
  ipfs: {
    address: string;
  };
}

export interface Label {
  cid: CID;
}

export const preserveToIpfs = async (
  options: PreserveToIpfsOptions
): Promise<Label> => {
  const {
    target: rawTarget,
    ipfs: { address }
  } = options;

  // init client
  const ipfs: IpfsClient = IpfsHttpClient(address);

  // normalize target
  const { source } = await Preserve.Targets.normalize(rawTarget);

  // depth-first search to add files to IPFS before parent directories
  const data = search({ source });

  // add to IPFS
  const results = ipfs.add(data);

  // take the last result, which will be the parent container
  return await asyncLast(results);
};

type SearchOptions = {
  source: Preserve.Targets.Normalized.Source;
  path?: string;
};

const search = ({
  source,
  path = "."
}: SearchOptions): AsyncIterable<FileObject> => {
  if (Preserve.Targets.Sources.isContent(source)) {
    return (async function*() {
      yield {
        path,
        content: source
      };
    })();
  }

  return (async function*() {
    for await (const entry of source.entries) {
      const results = search({
        source: entry.source,
        path: `${path}/${entry.path}`
      });

      for await (const result of results) {
        yield result;
      }
    }
  })();
};
