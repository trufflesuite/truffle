export namespace Results {
  export type Specification = {
    load: Promise<{
      solc: {
        compile(...args: any[]): any;
        version(): string;
      };
    }>;
    list: Promise<{
      latestRelease: string | undefined;
      releases: AsyncIterableIterator<string> | string[];
      prereleases: AsyncIterableIterator<string> | string[];
    }>;
  };
}
