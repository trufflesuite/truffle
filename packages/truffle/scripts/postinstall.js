const { statSync } = require("fs");
const { execSync } = require("child_process");

const bundledCLI = "./build/cli.bundled.js";
const unbundledCLI = "../truffle-core/cli.js";

const postinstallObtain = () => {
  try {
    statSync(bundledCLI);
    execSync(`node ${bundledCLI} obtain --solc=0.5.0`);
  } catch ({ message }) {
    if (message.includes("no such file"))
      return execSync(`node ${unbundledCLI} obtain --solc=0.5.0`);
    throw new Error(message);
  }
};

try {
  postinstallObtain();
} catch (error) {
  throw error;
}
