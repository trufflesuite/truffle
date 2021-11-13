import path from "path";
import originalRequire from "original-require";
import solcWrap from "solc/wrapper";
import { observeListeners } from "../observeListeners";

export class Local {
  load(localPath) {
    const listeners = observeListeners();
    try {
      let soljson, compilerPath;
      compilerPath = path.isAbsolute(localPath)
        ? localPath
        : path.resolve(process.cwd(), localPath);

      try {
        soljson = originalRequire(compilerPath);
      } catch (error) {
        throw new NoPathError(localPath, error);
      }
      //HACK: if it has a compile function, assume it's already wrapped
      return soljson.compile ? soljson : solcWrap(soljson);
    } finally {
      listeners.cleanup();
    }
  }
}

export class NoPathError extends Error {
  constructor(input, error) {
    const message = `Could not find compiler at: ${input}\n\n` + error;
    super(message);
  }
}
