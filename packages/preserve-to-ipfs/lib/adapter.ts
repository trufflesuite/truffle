import CID from "cids";

import * as Preserve from "@truffle/preserve";

export interface FileObject {
  path: string;
  content: Preserve.Targets.Normalized.Sources.Content;
}

export interface Label {
  cid: CID;
  path: string;
}

export interface IpfsClient {
  add(
    files: AsyncIterable<FileObject> | Iterable<FileObject>,
    options?: {
      wrapWithDirectory?: boolean;
    }
  ): AsyncIterable<Label>;

  version(): Promise<any>;

  get(
    cid: CID | string
  ): AsyncIterable<{
    path: string;
    content?: Preserve.Targets.Normalized.Sources.Content;
  }>;
}
