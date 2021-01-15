import { Normalized, normalize } from "./normalize";
import * as Common from "../types";

export namespace Thunked {
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

export const thunk = async (target: Common.Target): Promise<Thunked.Target> => {
  const { source } = normalize(target);

  return {
    source: await thunkSource(source)
  };
};

const thunkSource = async (
  source: Normalized.Source
): Promise<Thunked.Source> => {
  if (Common.Sources.isContent(source)) {
    return await thunkContent(source);
  }

  return await thunkContainer(source);
};

const thunkContainer = async (
  container: Normalized.Sources.Container
): Promise<Thunked.Sources.Container> => {
  const entries = [];

  for await (const entry of container.entries) {
    entries.push(await thunkEntry(entry));
  }

  return { entries };
};

const thunkEntry = async (
  entry: Normalized.Sources.Entry
): Promise<Thunked.Sources.Entry> => {
  return {
    path: entry.path,
    source: await thunkSource(entry.source)
  };
};

const thunkContent = async (
  content: Normalized.Sources.Content
): Promise<Thunked.Sources.Content> => {
  const buffers: Buffer[] = [];

  for await (const piece of content) {
    buffers.push(piece);
  }

  return Buffer.concat(buffers).toString();
};
