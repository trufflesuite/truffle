const path = require("path");
const originalRequire = require("original-require");
const LoadingStrategy = require("./LoadingStrategy");

class Local extends LoadingStrategy {
  load(localPath) {
    return this.getLocalCompiler(localPath);
  }

  getLocalCompiler(localPath) {
    let compiler, compilerPath;
    compilerPath = path.isAbsolute(localPath)
      ? localPath
      : path.resolve(process.cwd(), localPath);

    // dynamically load to forcibly ignore soljson
    require("@babel/register")({
      ignore: ["node_modules", localPath]
    });

    try {
      compiler = originalRequire(compilerPath);
      this.removeListener();
    } catch (error) {
      throw this.errors("noPath", localPath, error);
    }
    return compiler;
  }
}

module.exports = Local;
