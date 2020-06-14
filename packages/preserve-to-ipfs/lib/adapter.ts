import CID from "cids";

import * as Preserve from "@truffle/preserve";

export interface FileObject {
  path: string;
  content: Preserve.Targets.Normalized.Sources.Content;
}

export interface Label {
  cid: CID;
}

export interface IpfsClient {
  add(
    files: AsyncIterable<FileObject>,
    options?: {
      wrapWithDirectory?: boolean;
    }
  ): AsyncIterable<Label>;

  get(
    cid: CID | string
  ): AsyncIterable<{
    path: string;
    content?: Preserve.Targets.Normalized.Sources.Content;
  }>;
}
