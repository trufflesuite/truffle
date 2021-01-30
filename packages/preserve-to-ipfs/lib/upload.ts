import chalk from "chalk";
import CID from "cids";

import * as Preserve from "@truffle/preserve";
import { IpfsClient } from "./ipfs-adapter";
import { search } from "./search";
import { asyncToArray } from "iter-tools";

export interface UploadOptions {
  controls: Preserve.Controls;
  source: Preserve.Targets.Normalized.Source;
  ipfs: IpfsClient;
}

export interface UploadResult {
  cid: CID;
}

export async function* upload(
  options: UploadOptions
): Preserve.Process<UploadResult> {
  const { source, ipfs, controls } = options;
  const { step } = controls;

  const task = yield* step({
    message: "Uploading..."
  });

  // depth-first search to add files to IPFS before parent directories
  const data = await asyncToArray(search({ source }));

  // define a dictionary of values for CIDs that are resolved asynchronously
  const values: {
    [name: string]: Preserve.Control.ValueResolutionController;
  } = {};

  values.root = yield* task.declare({ identifier: "Root CID" });

  for await (const { path } of data) {
    if (path === ".") continue;
    values[path] = yield* values.root.extend({ identifier: path });
  }

  const results = ipfs.addAll(data, {
    wrapWithDirectory: Preserve.Targets.Sources.isContainer(source)
  });

  let result;
  try {
    for await (result of results) {
      const { path, cid } = result;

      // path is prefixed with ./ to match the result format to the source format
      const value = values[`./${path}`];

      if (value) {
        yield* value.resolve({
          resolution: { cid },
          payload: cid.toString()
        });
      }
    }
  } catch (error) {
    yield* task.fail({ error });
  }

  yield* values.root.resolve({
    resolution: result,
    payload: chalk.bold(result.cid.toString())
  });

  yield* task.succeed();

  return result;
}
