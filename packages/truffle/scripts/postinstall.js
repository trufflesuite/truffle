const { statSync } = require("fs");
const { execSync } = require("child_process");

const bundledCLI = "./build/cli.bundled.js";

const postinstallObtain = () => {
  try {
    statSync(bundledCLI);
    execSync(`node ${bundledCLI} obtain --solc=0.5.0`);
  } catch ({ message }) {
    if (message.includes("no such file")) return;
    throw new Error(message);
  }
};

try {
  postinstallObtain();
} catch (error) {
  throw error;
}
