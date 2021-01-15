import * as Common from "../types";

export namespace Normalized {
  export namespace Sources {
    export type Content = AsyncIterable<Buffer>;

    export interface Entry extends Common.Sources.Entry {
      path: string;
      source: Source;
    }

    export interface Container extends Common.Sources.Container {
      entries: AsyncIterable<Entry>;
    }

    export type Source = Content | Container;
  }

  export type Source = Sources.Source;

  export interface Target extends Common.Target {
    source: Source;
  }
}

export const normalize = (target: Common.Target): Normalized.Target => {
  return {
    source: normalizeSource(target.source)
  };
};

const normalizeSource = (source: Common.Source): Normalized.Source => {
  if (Common.Sources.isContainer(source)) {
    return normalizeContainer(source);
  }

  return normalizeContent(source);
};

const normalizeContainer = (
  container: Common.Sources.Container
): Normalized.Sources.Container => {
  return {
    entries: (async function*() {
      for await (const entry of container.entries) {
        yield normalizeEntry(entry);
      }
    })()
  };
};

const normalizeEntry = (
  entry: Common.Sources.Entry
): Normalized.Sources.Entry => {
  return {
    path: entry.path,
    source: normalizeSource(entry.source)
  };
};

const normalizeContent = (
  content: Common.Sources.Content
): Normalized.Sources.Content => {
  if (Common.Sources.Contents.isString(content)) {
    return normalizeString(content);
  }
  if (Common.Sources.Contents.isBytes(content)) {
    return normalizeBytes(content);
  }
  if (Common.Sources.Contents.isIterable(content)) {
    return normalizeIterable(content);
  }
  if (Common.Sources.Contents.isAsyncIterable(content)) {
    return normalizeAsyncIterable(content);
  }
};

const normalizeString = (content: string): Normalized.Sources.Content => {
  return (async function*() {
    yield Buffer.from(content);
  })();
};

const normalizeBytes = (
  content: Common.Sources.Contents.Bytes
): Normalized.Sources.Content => {
  return (async function*() {
    yield Buffer.from(content);
  })();
};

const normalizeIterable = (
  content: Iterable<Common.Sources.Contents.Bytes>
): Normalized.Sources.Content => {
  return (async function*() {
    for (const bytes of content) {
      yield Buffer.from(bytes);
    }
  })();
};

const normalizeAsyncIterable = (
  content: AsyncIterable<Common.Sources.Contents.Bytes>
): Normalized.Sources.Content => {
  return (async function*() {
    for await (const bytes of content) {
      yield Buffer.from(bytes);
    }
  })();
};
