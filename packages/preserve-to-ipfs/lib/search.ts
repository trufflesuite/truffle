import * as Preserve from "@truffle/preserve";
import { FileObject } from "./ipfs-adapter";

export type SearchOptions = {
  source: Preserve.Targets.Normalized.Source;
  path?: string;
};

export const search = ({
  source,
  path = "."
}: SearchOptions): AsyncIterable<FileObject> => {
  if (Preserve.Targets.Sources.isContent(source)) {
    return (async function* () {
      yield {
        path,
        content: source
      };
    })();
  }

  return (async function* () {
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
