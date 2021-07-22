import debugModule from "debug";
const debug = debugModule("fetch-and-compile:recognizers");
import * as Codec from "@truffle/codec";
import type {
  Recognizer,
  FailureType,
  FetchExternalErrors,
  Instances,
  SingleResult
} from "./types";
import type { WorkflowCompileResult } from "@truffle/compile-common";
import type { SourceInfo } from "@truffle/source-fetcher";

export class SingleRecognizer implements Recognizer {
  private address: string;
  private recognized: boolean = false;
  private compileResult: WorkflowCompileResult;
  private sourceInfo: SourceInfo;

  constructor(address: string) {
    this.address = address;
  }

  getUnrecognizedAddresses(): string[] {
    return this.recognized ? [] : [this.address];
  }

  getAnUnrecognizedAddress(): string | undefined {
    return this.recognized ? undefined : this.address;
  }

  markUnrecognizable(address: string, reason?: FailureType): never {
    //just throw...
    if (reason) {
      switch (reason) {
        case "fetch":
          throw new Error(`Error in fetching sources for ${address}`);
        case "compile":
          throw new Error(`Error in compiling sources for ${address}`);
      }
    } else {
      throw new Error(`No verified sources found for ${address}`);
    }
  }

  markBadFetcher(_fetcherName: string): void {
    //do nothing
  }

  addCompiledInfo(
    compileResult: WorkflowCompileResult,
    sourceInfo: SourceInfo,
    _address: string,
    _fetcherName: string
  ): void {
    this.compileResult = compileResult;
    this.sourceInfo = sourceInfo;
  }

  //not required by the interface!
  getResult(): SingleResult {
    return {
      compileResult: this.compileResult,
      sourceInfo: this.sourceInfo
    };
  }
}

export class DebugRecognizer implements Recognizer {
  private bugger: any; //sorry, we don't have a type for the debugger
  private addressesToSkip: Set<string> = new Set();
  private badFetchAddresses: string[] = [];
  private badCompileAddresses: string[] = [];
  private badFetchers: string[] = [];

  constructor(bugger: any) {
    this.bugger = bugger; //no clone, note!
  }

  getUnrecognizedAddresses(): string[] {
    debug("getting unknown addresses");
    const instances: Instances = this.bugger.view(
      this.bugger.selectors.session.info.affectedInstances
    );
    debug("got instances");
    return Object.entries(instances)
      .filter(([_, { contractName }]) => contractName === undefined)
      .map(([address, _]) => address);
  }

  getAnUnrecognizedAddress(): string | undefined {
    return this.getUnrecognizedAddresses().find(
      address => !this.addressesToSkip.has(address)
    );
  }

  markUnrecognizable(address: string, reason?: FailureType): void {
    if (reason) {
      switch (reason) {
        case "fetch":
          this.badFetchAddresses.push(address);
          break;
        case "compile":
          this.badCompileAddresses.push(address);
          break;
      }
    }
    this.addressesToSkip.add(address);
  }

  markBadFetcher(fetcherName: string): void {
    this.badFetchers.push(fetcherName);
  }

  async addCompiledInfo(
    compileResult: WorkflowCompileResult,
    _sourceInfo: SourceInfo,
    address: string,
    fetcherName: string
  ): Promise<void> {
    debug("compileResult: %O", compileResult);
    const compilations = compileResult.compilations;
    const shimmedCompilations = Codec.Compilations.Utils.shimCompilations(
      compilations,
      `externalFor(${address})Via(${fetcherName})`
    );
    await this.bugger.addExternalCompilations(shimmedCompilations);
  }

  //not required by the interface!
  getErrors(): FetchExternalErrors {
    return {
      fetch: this.badFetchAddresses,
      compile: this.badCompileAddresses,
      fetchers: this.badFetchers
    };
  }
}
