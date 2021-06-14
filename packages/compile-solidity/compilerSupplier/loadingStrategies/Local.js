const path = require("path");
const originalRequire = require("original-require");
const LoadingStrategy = require("./LoadingStrategy");
const solcWrap = require("solc/wrapper");

class Local extends LoadingStrategy {
  load(localPath) {
    return this.getLocalCompiler(localPath);
  }

  getLocalCompiler(localPath) {
    const markedListeners = this.markListeners();
    try {
      let soljson, compilerPath, wrapped;
      compilerPath = path.isAbsolute(localPath)
        ? localPath
        : path.resolve(process.cwd(), localPath);

      try {
        soljson = originalRequire(compilerPath);
      } catch (error) {
        throw this.errors("noPath", localPath, error);
      }
      //HACK: if it has a compile function, assume it's already wrapped
      return soljson.compile ? soljson : solcWrap(soljson);
    } finally {
      this.removeListener(markedListeners);
    }
  }
}

module.exports = Local;
