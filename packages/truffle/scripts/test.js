const { execSync } = require("child_process");
const semver = require("semver");

const args = " " + process.argv.slice(2).join(" ");
const execOption = { stdio: "inherit" };

// Define a base inverse grep pattern
let inverse_grep = "@geth";

// Extend the inverse grep pattern to skip Node >=12 tests
const node_version = semver.clean(process.version);
if (semver.satisfies(node_version, ">=12")) {
  inverse_grep = `${inverse_grep}|@>=12`;
}

const isEnv = e => Boolean(process.env[e]);

let cmd;
if (isEnv("GETH")) {
  cmd =
    "mocha --timeout 50000 --grep '@ganache|@standalone' --invert --colors" +
    args;
  execSync(cmd, execOption);
} else if (isEnv("FABRICEVM")) {
  cmd = "mocha --timeout 50000 --grep @fabric-evm --colors" + args;
  execSync(cmd, execOption);
} else if (isEnv("COVERAGE")) {
  cmd =
    `mocha --no-warnings --timeout 20000 --grep "${inverse_grep}" --invert --colors` +
    args;
  execSync(cmd, { ...execOption, NO_BUILD: true });
} else if (isEnv("INTEGRATION")) {
  cmd =
    `mocha --no-warnings --timeout 20000 --grep "${inverse_grep}" --invert --colors` +
    args;
  execSync(cmd, execOption);
} else {
  cmd = "yarn build";
  execSync(cmd, execOption);

  cmd =
    `mocha --no-warnings --timeout 20000 --grep "${inverse_grep}" --invert --colors` +
    args;
  console.log("cmd", cmd);
  execSync(cmd, execOption);
}
