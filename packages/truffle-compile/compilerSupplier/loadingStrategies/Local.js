const path = require("path");
const originalRequire = require("original-require");
const LoadingStrategy = require("./LoadingStrategy");

class Local extends LoadingStrategy {
  load(localPath) {
    return this.getLocalCompiler(localPath);
  }

  getLocalCompiler(localPath) {
    let compiler;

    if (!path.isAbsolute(localPath)) {
      localPath = path.resolve(process.cwd(), localPath);
    }

    try {
      compiler = originalRequire(localPath);
      this.removeListener();
    } catch (error) {
      throw this.errors("noPath", localPath, error);
    }

    return compiler;
  }
}

module.exports = Local;
