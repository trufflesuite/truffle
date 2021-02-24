const fs = require("fs");
const path = require("path");

// The highlightjs-solidity package contains code that exposes a bug
// in webpack 5 (at least, what I believe to be a bug). This is a
// hack to remove the offending line that we can call before
// running webpack.

const hljsSolidityPath = path.join(
  __dirname,
  "..", // truffle
  "..", // packages
  "..", // root
  "node_modules",
  "highlightjs-solidity",
  "solidity.js"
);

const offendingCode =
  "var module = module ? module : {};     // shim for browser use";
var hljsSolidityCode;

try {
  hljsSolidityCode = fs.readFileSync(hljsSolidityPath, "utf-8");
} catch (e) {
  console.log("Error reading file: " + hljsSolidityPath);
  console.log("Did you forget `yarn bootstrap`?");
  console.log(e.stack);
  process.exit(1); // exit with error code
}
hljsSolidityCode = hljsSolidityCode.replace(offendingCode, "");
fs.writeFileSync(hljsSolidityPath, hljsSolidityCode, "utf-8");
