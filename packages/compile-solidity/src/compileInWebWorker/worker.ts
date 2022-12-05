/* eslint-env worker */
import solcWrap from "solc/wrapper";

self.addEventListener(
  "message",
  e => {
    const { soljson, compilerInput } = e.data;
    const solc = solcWrap(eval(soljson + "; Module;"));
    const output = JSON.parse(solc.compile(JSON.stringify(compilerInput)));
    self.postMessage(output);
  },
  false
);
