import Wallet from "./index";
export default class EthereumHDKey {
  private readonly _hdkey?;
  static fromMasterSeed(seedBuffer: Buffer): EthereumHDKey;
  static fromExtendedKey(base58Key: string): EthereumHDKey;
  constructor(_hdkey?: any);
  privateExtendedKey(): Buffer;
  publicExtendedKey(): Buffer;
  derivePath(path: string): EthereumHDKey;
  deriveChild(index: number): EthereumHDKey;
  getWallet(): Wallet;
}
