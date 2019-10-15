import Wallet from "./index";
declare const HookedWalletEthTxSubprovider: any;
export default class WalletSubprovider extends HookedWalletEthTxSubprovider {
  constructor(wallet: Wallet, opts?: any);
}
export {};
