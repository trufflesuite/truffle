export default class Contract {
  constructor({
    contractName,
    source,
    sourcePath,
    binary,
    deployedBinary,
    sourceMap,
    deployedSourceMap
  }) {
    this.contractName = contractName;
    this.source = source;
    this.sourcePath = sourcePath;
    this.binary = binary;
    this.deployedBinary = deployedBinary;
    this.sourceMap = sourceMap;
    this.deployedSourceMap = deployedSourceMap;
  }
}

