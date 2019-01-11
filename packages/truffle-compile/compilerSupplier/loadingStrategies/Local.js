const path = require("path");
const originalRequire = require("original-require");
const LoadingStrategy = require("./LoadingStrategy");

class Local extends LoadingStrategy {
  load(localPath) {
    console.log("use local solc -> %o", localPath);
    return this.getLocalCompiler(localPath);
  }

  getLocalCompiler(localPath) {
    let compiler, compilerPath;
    compilerPath = path.isAbsolute(localPath)
      ? localPath
      : path.resolve(process.cwd(), localPath);

    try {
      compiler = originalRequire(compilerPath);
      console.log("the compiler keys %s", compiler);
      this.removeListener();
    } catch (error) {
      throw this.errors("noPath", localPath, error);
    }

    return compiler;
  }
}

module.exports = Local;
