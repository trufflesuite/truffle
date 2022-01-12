import debugModule from "debug";
const debug = debugModule("fetch-and-compile:debug");
import * as Codec from "@truffle/codec";
import type {
  Recognizer,
  FailureType,
  FetchExternalErrors,
  FetchAndCompileResult,
  Instances
} from "./types";

export class DebugRecognizer implements Recognizer {
  private bugger: any; //sorry, we don't have a type for the debugger
  private addressesToSkip: Set<string> = new Set();
  private badFetchAddresses: string[] = [];
  private badCompileAddresses: string[] = [];
  private badFetchers: string[] = [];

  constructor(bugger: any) {
    this.bugger = bugger; //no clone, note!
  }

  getErrors(): FetchExternalErrors {
    return {
      fetch: this.badFetchAddresses,
      compile: this.badCompileAddresses,
      fetchers: this.badFetchers
    };
  }

  //helper method
  private getUnrecognizedAddresses(): string[] {
    debug("getting unknown addresses");
    const instances: Instances = this.bugger.view(
      this.bugger.selectors.session.info.affectedInstances
    );
    debug("got instances");
    return Object.entries(instances)
      .filter(([_, { contractName }]) => contractName === undefined)
      .map(([address, _]) => address);
  }

  /*
   * Interface methods follow
   */

  isAddressUnrecognized(address: string): boolean {
    return this.getUnrecognizedAddresses().includes(address);
  }

  getAnUnrecognizedAddress(): string | undefined {
    return this.getUnrecognizedAddresses().find(
      address => !this.addressesToSkip.has(address)
    );
  }

  markUnrecognizable(address: string, reason?: FailureType): void {
    //debugger does not keep track of detailed errors
    if (reason) {
      switch (reason) {
        case "fetch":
          this.badFetchAddresses.push(address);
          break;
        case "compile":
          this.badCompileAddresses.push(address);
          break;
        default:
          //just ignore ones with unsupported language
          break;
      }
    }
    this.addressesToSkip.add(address);
  }

  markBadFetcher(fetcherName: string): void {
    this.badFetchers.push(fetcherName);
  }

  async addCompiledInfo(
    info: FetchAndCompileResult,
    address: string
  ): Promise<void> {
    debug("compileResult: %O", info.compileResult);
    const compilations = info.compileResult.compilations;
    const shimmedCompilations = Codec.Compilations.Utils.shimCompilations(
      compilations,
      `externalFor(${address})Via(${info.fetchedVia})`
    );
    await this.bugger.addExternalCompilations(shimmedCompilations);
  }
}
