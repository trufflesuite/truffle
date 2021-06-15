import CID from "cids";

import type * as Preserve from "@truffle/preserve";
import { search } from "./search";
import { asyncToArray } from "iter-tools";
import type { Buckets, Root } from "@textile/hub";

export interface UploadOptions {
  controls: Preserve.Controls;
  target: Preserve.Targets.Normalized.Target;
  buckets: Buckets;
  bucketKey: string;
}

export interface UploadResult extends Root {
  cid: CID
}

export async function* upload(
  options: UploadOptions
): Preserve.Process<UploadResult> {
  const { target, buckets, bucketKey, controls } = options;
  const { step } = controls;
  const { source } = target;

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

  for (const { path } of data) {
    values[path] = yield* values.root.extend({ identifier: path });
  }

  const results = buckets.pushPaths(bucketKey, data);

  try {
    for await (const result of results) {
      const { path, cid } = result;

      const value = values[path];

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

  // The actual directory is not included in buckets' results, so we have to
  // query to get its CID / info
  try {
    const root = await buckets.root(bucketKey);

    const cid = new CID(root.path.split("/").pop());

    yield* values.root.resolve({
      resolution: { cid },
      payload: root.thread
    });

    yield* task.succeed();

    return { ...root, cid };
  } catch (error) {
    yield* values.root.fail({ error });
  }
}
