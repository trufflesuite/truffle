import {
  JSONRPCRequestPayload,
  JSONRPCResponsePayload
} from 'ethereum-protocol';

export default class HDWalletProvider {
  constructor(
    mnemonic: string,
    provider: any,
    address_index?: number,
    num_addresses?: number,
    shareNonce?: boolean,
    wallet_hdpath?: string,
  )

  send(payload: JSONRPCRequestPayload): any;
  sendAsync(
    payload: JSONRPCRequestPayload,
    callback?: (
      error: null | Error,
      response: JSONRPCResponsePayload
    ) => void
  ): void;
  getAddress(idx?: number): string;
  getAddresses(): string[];
  static isValidProvider(provider: string | any): boolean;
}