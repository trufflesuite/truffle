import Wallet from "./index";
interface EtherWalletOptions {
  address: string;
  encrypted: boolean;
  locked: boolean;
  hash: string;
  private: string;
  public: string;
}
declare function fromEtherWallet(
  input: string | EtherWalletOptions,
  password: string
): Wallet;
declare function fromEtherCamp(passphrase: string): Wallet;
declare function fromKryptoKit(entropy: string, password: string): Wallet;
declare function fromQuorumWallet(passphrase: string, userid: string): Wallet;
declare const Thirdparty: {
  fromEtherWallet: typeof fromEtherWallet;
  fromEtherCamp: typeof fromEtherCamp;
  fromKryptoKit: typeof fromKryptoKit;
  fromQuorumWallet: typeof fromQuorumWallet;
};
export default Thirdparty;
