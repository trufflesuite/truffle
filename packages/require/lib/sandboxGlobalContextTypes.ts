import TruffleConfig from "@truffle/config";

export {};

declare global {
  const artifacts: {
      require: (contractName: string) => any;
    },
    config: TruffleConfig;
}
