interface ITruffleConfig {
  provider: any;
  network_id: number;
  network: string;
  networks: any;
  //
  ens?: any;
  //
  from?: string;
  gas?: number | string;
  gasPrice?: number | string;
  maxFeePerGas?: number | string;
  maxPriorityFeePerGas?: number | string;
  type?: string;
}

const provision = (contractAbstraction: any, truffleConfig: ITruffleConfig) => {
  if (truffleConfig.provider) {
    contractAbstraction.setProvider(truffleConfig.provider);
  }

  if (truffleConfig.network_id) {
    contractAbstraction.setNetwork(truffleConfig.network_id);
  }

  if (truffleConfig.network && truffleConfig.networks) {
    contractAbstraction.setNetworkType(
      truffleConfig.networks[truffleConfig.network].type
    );
    // this is a workaround to allow users to opt out of the block polling that
    // web3 performs when we listen for confirmations which causes problems in testing
    if (truffleConfig.networks[truffleConfig.network]) {
      const { disableConfirmationListener } =
        truffleConfig.networks[truffleConfig.network];
      contractAbstraction.disableConfirmationListener =
        disableConfirmationListener;
    }
  }

  contractAbstraction.ens = truffleConfig.ens;

  [
    "from",
    "gas",
    "gasPrice",
    "maxFeePerGas",
    "maxPriorityFeePerGas",
    "type"
  ].forEach(key => {
    if (truffleConfig[key as keyof ITruffleConfig]) {
      const obj: any = {};
      obj[key] = truffleConfig[key as keyof ITruffleConfig];
      contractAbstraction.defaults(obj);
    }
  });

  return contractAbstraction;
};

export = provision;
