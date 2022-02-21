const { statSync } = require("fs");
const { execSync, spawnSync } = require("child_process");

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

const postinstallAutocomplete = () => {
  const child = spawnSync(
    "node",
    `${bundledCLI} autocomplete install`.split(" ")
  );

  if (child.status !== 0) {
    const colors = require("colors");
    const warning = colors.yellow(
      `> Could not install CLI tab-complete [Status ${child.status}]\n` +
        `> To manually install tab-complete, type truffle autocomplete install\n`
    );
    console.log(warning);
  }
};

try {
  postinstallObtain();
  postinstallAutocomplete();
} catch (error) {
  console.error(error);
}
