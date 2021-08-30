const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

fs.rmdirSync("./dist", { recursive: true });
fs.mkdirSync("./dist");

const contractJs = path.join("dist", "truffle-contract.js");
const contractMap = path.join("dist", "truffle-contract.js.map");
const contractMin = path.join("dist", "truffle-contract.min.js");

// win32: commands require .cmd extension
const cmdExtension = process.platform === "win32" ? ".cmd" : "";
const browserifyCmd = `browserify${ cmdExtension }`;
const exorcistCmd = `exorcist${ cmdExtension }`;
const uglifyCmd = `uglifyjs${ cmdExtension }`;

// spawn returns a stream, whereas the exec family returns a buffer which has a
// max size that browserify *will* blow away.
const browserify = spawn(browserifyCmd, ["--debug", "./index.js"]);
browserify.on("exit", code => {
  if (code) process.exit(code);
});

const exorcist = spawn(exorcistCmd, [contractMap]);
exorcist.on("close", code => {
  if (code) process.exit(code);
  // call uglify iff successful exorcism
  const uglify = spawn(uglifyCmd, [contractJs, "-o", contractMin]);
  uglify.on("exit", code => {
    process.exit(code);
  });
});

// browserify | exorcist
browserify.stdout.pipe(exorcist.stdin);

// exorcist > contractJs
exorcist.stdout.pipe(fs.createWriteStream(contractJs));
