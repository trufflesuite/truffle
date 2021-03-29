import { asyncConcat, asyncToArray } from "iter-tools";
import CID from "cids";
import * as Preserve from "@truffle/preserve";

import { IpfsClient, IpfsGetResults } from "../../lib/ipfs-adapter";

export interface FetchOptions {
  cid: CID;
  ipfs: IpfsClient;
}

export const fetch = async ({
  cid,
  ipfs
}: FetchOptions): Promise<Preserve.Target> => {
  const results = ipfs.get(cid);

  return await convertResultsToTarget(results);
};

type Collection = Map<string, CollectionNode>;
type CollectionNode = string | Collection;

export const convertResultsToTarget = async (
  results: IpfsGetResults
): Promise<Preserve.Target> => {
  const root: Collection = new Map([]);

  for await (const result of results) {
    // skip directories
    if (!result.content) {
      continue;
    }

    // normalize path to start with "./"
    const path = [".", ...result.path.split("/").slice(1)];

    const concatenatedContent = await asyncToArray(asyncConcat(result.content));
    const stringifiedContent = concatenatedContent.toString();

    updateCollection(root, path, stringifiedContent);
  }

  const source = await convertCollectionToSource(root.get("."));

  return { source };
};

const updateCollection = (
  collection: Collection,
  path: string[],
  content: string
): Collection => {
  const [childPath, ...remainingPath] = path;

  // if we're at a leaf of the tree we update the collection
  if (remainingPath.length === 0) {
    collection.set(childPath, content);
    return;
  }

  // otherwise, make sure we have the first part of the path in our collection
  let child: Collection;
  const entry = collection.get(childPath);
  if (entry === undefined || typeof entry === "string") {
    // for string case, something went wrong:
    // we tried to path through some content
    child = new Map([]);

    collection.set(childPath, child);
  } else {
    child = entry;
  }

  // then recurse
  updateCollection(child, remainingPath, content);
};

export const convertCollectionToSource = async (
  collectionNode: CollectionNode
): Promise<Preserve.Targets.Source> => {
  if (typeof collectionNode === "string") {
    return collectionNode;
  }

  return {
    entries: await Promise.all(
      Array.from(collectionNode.entries()).map(async ([path, result]) => ({
        path,
        source: await convertCollectionToSource(result)
      }))
    )
  };
};
