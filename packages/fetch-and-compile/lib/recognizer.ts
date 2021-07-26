import debugModule from "debug";
const debug = debugModule("fetch-and-compile:recognizer");
import type {
  Recognizer,
  FailureType,
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

  getResult(): SingleResult {
    return {
      compileResult: this.compileResult,
      sourceInfo: this.sourceInfo
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
}
