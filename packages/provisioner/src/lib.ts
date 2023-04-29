import { ProvisionerOptions } from "./types";

export const provision = (
  contractAbstraction: any,
  truffleConfig: ProvisionerOptions
) => {
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
    if (truffleConfig[key as keyof ProvisionerOptions]) {
      const obj: any = {};
      obj[key] = truffleConfig[key as keyof ProvisionerOptions];
      contractAbstraction.defaults(obj);
    }
  });

  return contractAbstraction;
};
