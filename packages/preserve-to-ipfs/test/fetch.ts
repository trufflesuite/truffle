import assert from "assert";
import { asyncFilter, asyncToArray, asyncMap } from "iter-tools";
// use this package because iter-tools doesn't support BufferList returned
// by ipfs.get()
import concat from "it-concat";
import CID from "cids";

import * as Preserve from "@truffle/preserve";
import { IpfsClient } from "../lib/adapter";

export interface FetchOptions {
  cid: CID;
  ipfs: IpfsClient;
}

export const fetch = async ({
  cid,
  ipfs
}: FetchOptions): Promise<Preserve.Target> => {
  const results = ipfs.get(cid);

  return await collect({
    results: asyncMap(
      ({ path, content }) => ({
        content,
        path: [".", ...path.split("/").slice(1)]
      }),
      results
    )
  });
};

interface CollectResult {
  path: string[];
  content?: Preserve.Targets.Normalized.Sources.Content;
}

interface CollectOptions {
  results: AsyncIterable<CollectResult>;
}

interface Collection {
  map: Map<string, Result>;
}

type Result = string | Collection;

export const convert = async (
  result: Result
): Promise<Preserve.Targets.Source> => {
  if (typeof result === "string") {
    return result;
  }

  return {
    entries: await Promise.all(
      Array.from(result.map.entries()).map(async ([path, result]) => ({
        path,
        source: await convert(result)
      }))
    )
  };
};

const findOrMakeCollection = (root: Collection, path: string[]): Collection => {
  // base case
  if (path.length === 1) {
    return root;
  }

  // otherwise, make sure we have the first part of the path in our root
  let child: Collection;
  const childPath: string = path[0];
  const entry = root.map.get(childPath);

  if (entry === undefined || typeof entry === "string") {
    // for string case, something went wrong: we tried to path through some
    // content
    child = {
      map: new Map([])
    };

    root.map.set(childPath, child);
  } else {
    child = entry;
  }

  // then recurse
  return findOrMakeCollection(child, path.slice(1));
};

export const collect = async ({
  results
}: CollectOptions): Promise<Preserve.Target> => {
  const root: Collection = {
    map: new Map([])
  };

  for await (const { path, content } of results) {
    if (!content) {
      continue;
    }

    const collection = await findOrMakeCollection(root, path);

    // take the last part of the path
    const basename = path[path.length - 1];

    collection.map.set(basename, (await concat(content)).toString());
  }

  return {
    source: await convert(root.map.get("."))
  };
};
