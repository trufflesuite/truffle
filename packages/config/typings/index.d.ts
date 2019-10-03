declare class TruffleConfig {
  constructor(
    truffleDirectory: string,
    workingDirectory: string,
    network: string
  );
  public network: string;
  public networks: any;
}

declare namespace TruffleConfig {
  function load(file?: string, options?: any): TruffleConfig;
}

export default TruffleConfig;
