declare class TruffleConfig {
  constructor(truffleDirectory: string, workingDirectory: string, network: string);
}

declare namespace TruffleConfig {
  function load(file: string, options: any): TruffleConfig
}


export default TruffleConfig;
