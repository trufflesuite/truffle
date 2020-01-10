interface V3Params {
  kdf: string;
  cipher: string;
  salt: string | Buffer;
  iv: string | Buffer;
  uuid: string | Buffer;
  dklen: number;
  c: number;
  n: number;
  r: number;
  p: number;
}
interface ScryptKDFParamsOut {
  dklen: number;
  n: number;
  p: number;
  r: number;
  salt: string;
}
interface PBKDFParamsOut {
  c: number;
  dklen: number;
  prf: string;
  salt: string;
}
declare type KDFParamsOut = ScryptKDFParamsOut | PBKDFParamsOut;
interface V1Keystore {
  Address: string;
  Crypto: {
    CipherText: string;
    IV: string;
    KeyHeader: {
      Kdf: string;
      KdfParams: {
        DkLen: number;
        N: number;
        P: number;
        R: number;
        SaltLen: number;
      };
      Version: string;
    };
    MAC: string;
    Salt: string;
  };
  Id: string;
  Version: string;
}
interface V3Keystore {
  crypto: {
    cipher: string;
    cipherparams: {
      iv: string;
    };
    ciphertext: string;
    kdf: string;
    kdfparams: KDFParamsOut;
    mac: string;
  };
  id: string;
  version: number;
}
interface EthSaleKeystore {
  encseed: string;
  ethaddr: string;
  btcaddr: string;
  email: string;
}
export default class Wallet {
  private readonly privateKey?;
  private publicKey;
  constructor(privateKey?: Buffer | undefined, publicKey?: Buffer | undefined);
  static generate(icapDirect?: boolean): Wallet;
  static generateVanityAddress(pattern: RegExp | string): Wallet;
  static fromPublicKey(publicKey: Buffer, nonStrict?: boolean): Wallet;
  static fromExtendedPublicKey(extendedPublicKey: string): Wallet;
  static fromPrivateKey(privateKey: Buffer): Wallet;
  static fromExtendedPrivateKey(extendedPrivateKey: string): Wallet;
  static fromV1(input: string | V1Keystore, password: string): Wallet;
  static fromV3(
    input: string | V3Keystore,
    password: string,
    nonStrict?: boolean
  ): Wallet;
  static fromEthSale(input: string | EthSaleKeystore, password: string): Wallet;
  private readonly pubKey;
  private readonly privKey;
  getPrivateKey(): Buffer;
  getPrivateKeyString(): string;
  getPublicKey(): Buffer;
  getPublicKeyString(): string;
  getAddress(): Buffer;
  getAddressString(): string;
  getChecksumAddressString(): string;
  toV3(password: string, opts?: Partial<V3Params>): V3Keystore;
  getV3Filename(timestamp?: number): string;
  toV3String(password: string, opts?: Partial<V3Params>): string;
}
export {};
