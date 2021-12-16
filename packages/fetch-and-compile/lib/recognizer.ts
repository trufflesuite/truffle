import debugModule from "debug";
const debug = debugModule("fetch-and-compile:recognizer");
import type { Recognizer, FailureType, FetchAndCompileResult } from "./types";
import type { WorkflowCompileResult } from "@truffle/compile-common";
import type { SourceInfo } from "@truffle/source-fetcher";

export class SingleRecognizer implements Recognizer {
  private address: string;
  private recognized: boolean = false;
  private fetchedVia: string;
  private compileResult: WorkflowCompileResult;
  private sourceInfo: SourceInfo;

  constructor(address: string) {
    this.address = address;
  }

  getResult(): FetchAndCompileResult {
    return {
      compileResult: this.compileResult,
      sourceInfo: this.sourceInfo,
      fetchedVia: this.fetchedVia
    };
  }

  /*
   * Interface methods follow
   */

  isAddressUnrecognized(address: string): boolean {
    return !this.recognized || address !== this.address; //I guess?
  }

  getAnUnrecognizedAddress(): string | undefined {
    return this.recognized ? undefined : this.address;
  }

  markUnrecognizable(
    address: string,
    reason?: FailureType,
    error?: Error
  ): never {
    //just throw...
    if (error) {
      throw error;
    } else if (reason) {
      switch (reason) {
        case "fetch":
          throw new Error(`Error in fetching sources for ${address}`);
        case "compile":
          throw new Error(`Error in compiling sources for ${address}`);
        case "language":
          throw new Error(
            `Sources for ${address} were not in a supported language`
          );
      }
    } else {
      throw new Error(`No verified sources found for ${address}`);
    }
  }

  markBadFetcher(_fetcherName: string): void {
    //do nothing
  }

  addCompiledInfo(info: FetchAndCompileResult, address: string): void {
    this.compileResult = info.compileResult;
    this.sourceInfo = info.sourceInfo;
    if (address === this.address) {
      //I guess? this should never be false
      this.recognized = true;
      this.fetchedVia = info.fetchedVia;
    }
  }
}
