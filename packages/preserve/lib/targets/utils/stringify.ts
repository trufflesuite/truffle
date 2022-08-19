import { Normalized, normalize } from "./normalize";
import * as Common from "..";

export namespace Stringified {
  export namespace Sources {
    export type Content = string;

    export interface Entry extends Common.Sources.Entry {
      path: string;
      source: Source;
    }

    export interface Container extends Common.Sources.Container {
      entries: Entry[];
    }

    export type Source = Content | Container;
  }

  export type Source = Sources.Source;

  export interface Target extends Common.Target {
    source: Source;
  }
}

export const stringify = async (
  target: Common.Target
): Promise<Stringified.Target> => {
  const normalizedTarget = normalize(target);
  const source = await stringifySource(normalizedTarget.source);
  return { source };
};

const stringifySource = async (
  source: Normalized.Source
): Promise<Stringified.Source> => {
  if (Common.Sources.isContainer(source)) {
    return await stringifyContainer(source);
  }

  return await stringifyContent(source);
};

const stringifyContainer = async (
  container: Normalized.Sources.Container
): Promise<Stringified.Sources.Container> => {
  const entries = [];

  for await (const entry of container.entries) {
    entries.push(await stringifyEntry(entry));
  }

  return { entries };
};

const stringifyEntry = async (
  entry: Normalized.Sources.Entry
): Promise<Stringified.Sources.Entry> => {
  const { path } = entry;
  const source = await stringifySource(entry.source);
  return { path, source };
};

const stringifyContent = async (
  content: Normalized.Sources.Content
): Promise<Stringified.Sources.Content> => {
  const buffers: Buffer[] = [];

  for await (const piece of content) {
    buffers.push(piece);
  }

  return Buffer.concat(buffers).toString();
};
