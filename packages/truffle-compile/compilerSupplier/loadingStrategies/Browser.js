const VersionRange = require("./VersionRange");
const solcWrap = require("solc/wrapper");

const COMPILER_SLUG = "Module";

// Note: This code should only be run in browser context.
// This will suffer from only loading the first compiler downloaded
// because we have to add a script tag. Why? Ask Solidity.
// TODO: Attempt to store newly loaded Module variable in memory
// and allow loading of other versions.
class Browser extends VersionRange {
  //// Overridden functions

  addFileToCache(code) {
    this.addScriptTagWithCompilerCode(code);
  }

  fileIsCached() {
    return this.hasCompilerBeenLoaded();
  }

  compilerFromString(code) {
    // If a script tag exists, use that as the source of truth.
    if (!this.hasCompilerBeenLoaded()) {
      this.addScriptTagWithCompilerCode(code);
    }

    return this.getBrowserSolc();
  }

  getCachedSolcByFileName() {
    return this.getBrowserSolc();
  }

  //// New functions

  hasCompilerBeenLoaded() {
    return window[COMPILER_SLUG] != null;
  }

  addScriptTagWithCompilerCode(code) {
    if (typeof document == "undefined") {
      throw new Error(
        "No document object. Are you sure you're running in the browser?"
      );
    }

    var s = document.createElement("script");
    s.innerHTML = code;
    document.body.appendChild(s);
  }

  getBrowserSolc() {
    const soljson = window[COMPILER_SLUG];
    const wrapped = solcWrap(soljson);
    this.removeListener();
    return wrapped;
  }
}

module.exports = Browser;
