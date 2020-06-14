import fs from "fs";
import { join as joinPath } from "path";

import * as Preserve from "@truffle/preserve";

export interface TargetPathOptions {
  path: string;
}

export const targetPath = async (
  options: TargetPathOptions
): Promise<Preserve.Target> => {
  const { path } = options;

  const stats = await fs.promises.stat(path);

  if (stats.isFile()) {
    return {
      source: await pathContent({ path })
    };
  } else if (stats.isDirectory()) {
    return {
      source: await pathContainer({ path })
    };
  }
};

type PathEntryOptions = {
  path: string;
  parent: string;
};

const pathEntry = async ({
  path,
  parent
}: PathEntryOptions): Promise<Preserve.Targets.Sources.Entry> => {
  const stats = await fs.promises.stat(joinPath(parent, path));

  if (stats.isFile()) {
    return {
      path,
      source: await pathContent({ path: joinPath(parent, path) })
    };
  }

  if (stats.isDirectory()) {
    return {
      path,
      source: await pathContainer({ path: joinPath(parent, path) })
    };
  }
};

const pathContent = async ({
  path
}: TargetPathOptions): Promise<Preserve.Targets.Sources.Content> => {
  return fs.createReadStream(path);
};

const pathContainer = async ({
  path
}: TargetPathOptions): Promise<Preserve.Targets.Sources.Container> => {
  const directory = await fs.promises.readdir(path);

  return {
    entries: (async function*() {
      for (const childPath of directory) {
        yield await pathEntry({
          path: childPath,
          parent: path
        });
      }
    })()
  };
};
