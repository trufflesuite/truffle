#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const execOpt = { stdio: "inherit" }

//Simulate "$@" 
//arg0 is node, arg1 is __filename
const argv = process.argv.slice(2);

const mocha = "mocha --colors --exit --grep @geth --recursive --timeout 7000".split(" ");
const nonGethOptions = "--no-warnings  --invert".split(" ");

const makeCommand = (cmd, opts=[]) => [...cmd, ...opts, ...argv].join(' ');

if (Boolean(process.env.GETH)) {
  execSync(makeCommand(mocha), execOpt); 
} else {
  execSync(makeCommand(mocha, nonGethOptions), execOpt); 
}
