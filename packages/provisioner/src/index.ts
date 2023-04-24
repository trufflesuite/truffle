import type TruffleConfig from "@truffle/config";

const provision = (contractAbstraction: any, truffleConfig: TruffleConfig) => {
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
  //HACK
  contractAbstraction.ens.registryAddress =
    truffleConfig.networks[truffleConfig.network]?.registryAddress ??
    truffleConfig.networks[truffleConfig.network]?.registry?.address ??
    truffleConfig.ens.registryAddress ??
    truffleConfig.ens.registry?.address;

  [
    "from",
    "gas",
    "gasPrice",
    "maxFeePerGas",
    "maxPriorityFeePerGas",
    "type"
  ].forEach(key => {
    if (truffleConfig[key]) {
      const obj: any = {};
      obj[key] = truffleConfig[key];
      contractAbstraction.defaults(obj);
    }
  });

  return contractAbstraction;
};

export = provision;
