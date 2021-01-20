import fs from "fs";
import { join as joinPath } from "path";

import * as Preserve from "@truffle/preserve";
import { TargetPathOptions, PathEntryOptions } from "./types";

export async function* targetPath(
  options: TargetPathOptions
): Preserve.Process<Preserve.Target> {
  const { path } = options;

  const stats = await fs.promises.stat(path);

  if (stats.isFile()) {
    return {
      source: yield* pathContent(options)
    };
  } else if (stats.isDirectory()) {
    return {
      source: yield* pathContainer(options)
    };
  }
}

async function* pathContent(
  options: TargetPathOptions
): Preserve.Process<Preserve.Targets.Sources.Content> {
  const { path, verbose, controls } = options;
  const { step } = controls;

  const task = verbose
    ? yield* step({ message: `Opening ./${path}...` })
    : controls;

  const content = fs.createReadStream(path);

  if (verbose) {
    yield* (task as Preserve.Control.StepsController).succeed();
  }

  return content;
}

async function* pathContainer(
  options: TargetPathOptions
): Preserve.Process<Preserve.Targets.Sources.Container> {
  const { path, verbose, controls } = options;

  const { step } = controls;

  const task = verbose
    ? yield* step({ message: `Reading directory ${path}...` })
    : controls;

  const directory = await fs.promises.readdir(path);

  const entries: Preserve.Targets.Sources.Entry[] = [];
  for (const childPath of directory) {
    const entry = yield* pathEntry({
      ...options,
      controls: task,
      path: childPath,
      parent: path
    });

    entries.push(entry);
  }

  if (verbose) {
    yield* (task as Preserve.Control.StepsController).succeed();
  }

  return {
    entries
  };
}

async function* pathEntry(
  options: PathEntryOptions
): Preserve.Process<Preserve.Targets.Sources.Entry> {
  const { path, parent } = options;

  const stats = await fs.promises.stat(joinPath(parent, path));

  if (stats.isFile()) {
    return {
      path,
      source: yield* pathContent({
        ...options,
        path: joinPath(parent, path)
      })
    };
  }

  if (stats.isDirectory()) {
    return {
      path,
      source: yield* pathContainer({
        ...options,
        path: joinPath(parent, path)
      })
    };
  }
}
