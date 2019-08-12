import * as fs from "fs";

// So, we were able to recreate "require" in a better way than original-require.
// Do we need original-require at all?

// See here: https://michelenasti.com/2018/10/02/let-s-write-a-simple-version-of-the-require-function.html
module.exports = function originalRequire(name) {
  let code = fs.readFileSync(name, "utf8");
  let module = { exports: {} };
  let wrapper = new Function("require, exports, module", code);
  wrapper(originalRequire, module.exports, module);
  return module.exports;
};
