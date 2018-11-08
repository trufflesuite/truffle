const which = require("which");
const { spawn } = require("child_process");

function truffleSlitherAnalyze(options) {
  try {
    let slither = which.sync("slither");
    let child = spawn(slither, options);
    child.stdout.on("data", data => process.stdout.write(data.toString()));
    child.stderr.on("data", data => process.stdout.write(data.toString()));
  } catch (error) {
    console.log("Slither not found in path");
    console.log(
      `Please install the package using \`pip install slither-analyzer\`\n`
    );
    throw error;
  }
}

module.exports = truffleSlitherAnalyze;
