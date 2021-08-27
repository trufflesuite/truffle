#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const execOpt = { stdio: "inherit" }

//Simulate "$@" 
//arg0 is node, arg1 is __filename
const argv = process.argv.slice(2);

mocha --recursive --timeout 7000 --grep @geth --colors --exit
mocha --no-warnings  --invert 

let mocha = ["mocha", "./test/**", "./test/**/*", "--timeout", "70000" ];

const grepOpts = ["--invert --grep native"];

const makeCommand = (cmd, opts=[]) => [...cmd, ...opts, ...argv].join(' ');

if (Boolean(process.env.CI)) {
  execSync(makeCommand(mocha), execOpt); 
} else {
  const cachedTruffle = path.join(process.cwd(), "node_modules", ".cache", "truffle");
  fs.rmdirSync(cachedTruffle, { recursive: true, force: true });
  execSync(makeCommand(mocha, grepOpts), execOpt); 
}
