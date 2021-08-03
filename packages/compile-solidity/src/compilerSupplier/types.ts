export namespace Results {
  export type Specification = {
    load: Promise<{
      solc: any; // maybe could use better solc type
    }>;
    list: Promise<{
      latestRelease: string | undefined;
      releases: AsyncIterableIterator<string> | string[];
      prereleases: AsyncIterableIterator<string> | string[];
    }>
  };
};
