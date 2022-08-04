import debugModule from "debug";
const debug = debugModule("fetch-and-compile:multiple");
import type {
  Recognizer,
  FailureType,
  FetchAndCompileResult,
  FetchAndCompileMultipleResult,
  FetchAndCompileFailureRecord
} from "./types";
import * as Web3Utils from "web3-utils";

export class MultipleRecognizer implements Recognizer {
  private unrecognizedAddresses: string[];
  private addressesToSkip: Set<string> = new Set();
  private results: { [address: string]: FetchAndCompileResult } = {};
  private failureLog: { [address: string]: FetchAndCompileFailureRecord } = {};

  constructor(addresses: string[]) {
    this.unrecognizedAddresses = [
      ...new Set(addresses.map(Web3Utils.toChecksumAddress))
    ]; //remove duplicates (checksum to make case-insensitive & canonical) and clone
  }

  getResults(): FetchAndCompileMultipleResult {
    return {
      results: this.results,
      failures: this.failureLog
    };
  }

  /*
   * Interface methods follow
   */

  isAddressUnrecognized(address: string): boolean {
    return this.unrecognizedAddresses.includes(address);
  }

  getAnUnrecognizedAddress(): string | undefined {
    return this.unrecognizedAddresses.find(
      address => !this.addressesToSkip.has(address)
    );
  }

  markUnrecognizable(
    address: string,
    reason?: FailureType,
    error?: Error
  ): void {
    this.failureLog[address] = { reason, error };
    this.addressesToSkip.add(address);
  }

  markBadFetcher(_fetcherName: string): void {
    //do nothing
  }

  addCompiledInfo(info: FetchAndCompileResult, address: string): void {
    this.results[address] = info;
    const index = this.unrecognizedAddresses.indexOf(address);
    this.unrecognizedAddresses.splice(index, 1); //delete the address from the array
  }
}
