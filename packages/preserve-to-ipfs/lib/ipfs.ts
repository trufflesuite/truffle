import chalk from "chalk";
import { asyncToArray, asyncLast } from "iter-tools";
import CID from "cids";
const IpfsHttpClient: any = require("ipfs-http-client");

import * as Preserve from "@truffle/preserve";

import { FileObject, IpfsClient } from "./adapter";

export interface PreserveToIpfsOptions
  extends Preserve.Recipes.PreserveOptions {
  target: Preserve.Target;
  ipfs: {
    address: string;
  };
}

export interface Label {
  cid: CID;
}

export const preserveToIpfs = async (
  options: Omit<
    PreserveToIpfsOptions,
    "log" | "declare" | "step" | "settings" | "labels"
  >
): Promise<Label> => {
  const { controls } = Preserve.Recipes.Logs.createController(
    "@truffle/preserve-to-ipfs"
  );

  const preserves = preserve({
    ...options,
    ...controls,
    settings: undefined,
    labels: new Map([])
  });

  while (true) {
    const { done, value } = await preserves.next();

    if (done) {
      return value as Label;
    }
  }
};

export async function* preserve(
  options: PreserveToIpfsOptions
): Preserve.Recipes.Preserves<Label> {
  const {
    target: rawTarget,
    ipfs: { address },
    log,
    declare
  } = options;

  yield* log({ message: "Preserving to IPFS..." });

  const unknowns: {
    [unknown: string]: Preserve.Recipes.Logs.Unknown;
  } = {
    root: yield* declare({ identifier: "Root CID" })
  };

  // init client
  const ipfs: IpfsClient = IpfsHttpClient(address);

  // normalize target
  const { source } = await Preserve.Targets.normalize(rawTarget);

  // depth-first search to add files to IPFS before parent directories
  const data = await asyncToArray(search({ source }));

  for (const { path } of data) {
    if (path !== ".") {
      unknowns[path] = yield* unknowns.root.extend({ identifier: path });
    }
  }

  // add to IPFS
  const results = ipfs.add(data, {
    wrapWithDirectory: Preserve.Targets.Sources.isContainer(source)
  });

  let result;
  for await (result of results) {
    const { path, cid } = result;

    const unknown = unknowns[`./${path}`];
    if (unknown) {
      yield* unknown.resolve({
        label: { cid },
        message: `./${path}: ${cid.toString()}`
      });
    }
  }

  // take the last result, which will be the parent container
  const label = result;

  yield* unknowns.root.resolve({
    label,
    message: `Root CID: ${chalk.bold(label.cid.toString())}`
  });

  return label;
}

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
