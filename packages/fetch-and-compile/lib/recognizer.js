"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleRecognizer = void 0;
var debug_1 = require("debug");
var debug = (0, debug_1.default)("fetch-and-compile:recognizer");
var SingleRecognizer = /** @class */ (function () {
  function SingleRecognizer(address) {
    this.recognized = false;
    this.address = address;
  }
  SingleRecognizer.prototype.getResult = function () {
    return {
      compileResult: this.compileResult,
      sourceInfo: this.sourceInfo,
      fetchedVia: this.fetchedVia
    };
  };
  /*
   * Interface methods follow
   */
  SingleRecognizer.prototype.isAddressUnrecognized = function (address) {
    return !this.recognized || address !== this.address; //I guess?
  };
  SingleRecognizer.prototype.getAnUnrecognizedAddress = function () {
    return this.recognized ? undefined : this.address;
  };
  SingleRecognizer.prototype.markUnrecognizable = function (
    address,
    reason,
    error
  ) {
    //just throw...
    if (error) {
      throw error;
    } else if (reason) {
      switch (reason) {
        case "fetch":
          throw new Error("Error in fetching sources for ".concat(address));
        case "compile":
          throw new Error("Error in compiling sources for ".concat(address));
        case "language":
          throw new Error(
            "Sources for ".concat(address, " were not in a supported language")
          );
      }
    } else {
      throw new Error("No verified sources found for ".concat(address));
    }
  };
  SingleRecognizer.prototype.markBadFetcher = function (_fetcherName) {
    //do nothing
  };
  SingleRecognizer.prototype.addCompiledInfo = function (info, address) {
    this.compileResult = info.compileResult;
    this.sourceInfo = info.sourceInfo;
    if (address === this.address) {
      //I guess? this should never be false
      this.recognized = true;
      this.fetchedVia = info.fetchedVia;
    }
  };
  return SingleRecognizer;
})();
exports.SingleRecognizer = SingleRecognizer;
