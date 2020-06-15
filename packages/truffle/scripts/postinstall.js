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

const postInstallTezosGanache = () => {
  let response;
  try {
    statSync(bundledCLI);
    console.log(`\n- Fetching ganache-core@tezos...`);
    try {
      response = execSync(`npm list ganache-core`);
    } catch (_error) {
      // ganache-core wasn't found, download it!
      console.log(`- Post-installing ganache-core@tezos...`);
      execSync(`npm i ganache-core@tezos`);
      console.log(`- Success!`);
      return;
    }
    if (!response.includes("tezos")) {
      console.log(`- Post-installing ganache-core@tezos...`);
      execSync(`npm i ganache-core@tezos`);
    }
    console.log(`- Success!`);
  } catch (error) {
    if (error.message.includes("no such file")) return;
    throw new Error(error);
  }
};

try {
  postinstallObtain();
  postInstallTezosGanache();
} catch (error) {
  console.error(error);
}
