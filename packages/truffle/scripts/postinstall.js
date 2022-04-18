const { statSync } = require("fs");
const { execSync } = require("child_process");

const bundledCLI = "./build/cli.bundled.js";
const defaultSolcVersion = "0.5.16";

const postinstallObtain = () => {
  try {
    statSync(bundledCLI);
    execSync(`node ${bundledCLI} obtain --solc=${defaultSolcVersion}`);
  } catch ({ message }) {
    if (message.includes("no such file")) return;
    throw new Error(
      `Error while attempting to download and cache solc ${defaultSolcVersion}: ${message}`
    );
  }
};

try {
  postinstallObtain();
} catch (error) {
  console.error(error);
}
