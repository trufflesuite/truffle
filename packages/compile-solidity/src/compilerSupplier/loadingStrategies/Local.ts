import path from "path";
import originalRequire from "original-require";
import solcWrap from "solc/wrapper";
import { observeListeners } from "../observeListeners";

export class Local {
  load(localPath: string) {
    const listeners = observeListeners();
    try {
      const compilerPath = path.isAbsolute(localPath)
        ? localPath
        : path.resolve(process.cwd(), localPath);

      let soljson: any;
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
  constructor(input: string, error: Error) {
    const message = `Could not find compiler at: ${input}\n\n` + error;
    super(message);
  }
}
