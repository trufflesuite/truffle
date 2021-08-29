const semver = require("semver");
const { execSync } = require("child_process");

//arg0 is node, arg1 is __filename
const args = process.argv.slice(2).join(" ");
const jestCmd = `yarn jest --verbose --detectOpenHandles ${args}`;
const execOpt = { stdio: "inherit" };

// skip the tests since IPFS requires at least Node 12
const node_version = semver.clean(process.version);
if (semver.satisfies(node_version, ">=12")) {
  execSync(jestCmd, execOpt);
}
