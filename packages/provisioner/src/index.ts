import TruffleConfig from "@truffle/config";

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
  }

  contractAbstraction.ens = truffleConfig.ens;

  ["from", "gas", "gasPrice"].forEach(key => {
    if (truffleConfig[key]) {
      const obj: any = {};
      obj[key] = truffleConfig[key];
      contractAbstraction.defaults(obj);
    }
  });

  return contractAbstraction;
};

export = provision;
