import * as BrowserFS from "browserfs";
import fs from "fs";
import path from "path";

const AvailableCommands = require("truffle-core/lib/commands");
const Command = require("truffle-core/lib/command");
const TaskError = require("truffle-core/lib/errors/taskerror");
const uuidv4 = require("uuid/v4");
const ganache = require("ganache-core");

import * as init from "./commands/browser-init";

class Truffle {
  constructor() {
    BrowserFS.install(window);

    // Runtime correction (hack). BrowserFS doesn't support Buffers passed
    // to statSync to denote paths (or so it seems). A dependency of Truffle
    // uses a buffer to describe a path. Let's intercept and neutralize!
    var oldStatSync = fs.statSync.bind(fs);
    fs.statSync = (location, options) => {
      if (typeof location == "object") {
        location = location.toString();
      }
      return oldStatSync(location, options);
    };

    var oldReaddirSync = fs.readdirSync.bind(fs);
    fs.readdirSync = (location, options) => {
      if (typeof location == "object") {
        location = location.toString();
      }
      return oldReaddirSync(location, options);
    };

    // This is a casualty of the above hacks, I believe. Now that the above functions
    // send a string, strings are appearing in buffers and need to be converted back.
    var oldConcat = Buffer.concat;
    Buffer.concat = (array, number) => {
      array = array.map(item => {
        if (typeof item == "string") {
          item = new Buffer(item);
        }
        return item;
      });
      return oldConcat(array, number);
    };

    // Start initialization
    this.id = uuidv4();
    this.root_dir = "/" + this.id;

    this.chain_id = new Date().getTime();
    this.chain_dir = path.join(this.root_dir, ".chain");

    // This is to satify Yargs. I'm pretty sure it's a bundling issue
    // but I don't know how to fix it.
    window.__dirname = this.root_dir;

    this.availableCommands = Object.assign({}, AvailableCommands, {
      init: init
    });
    this.command = new Command(this.availableCommands);

    // Configures BrowserFS to use the LocalStorage file system.
    BrowserFS.configure(
      {
        fs: "LocalStorage"
      },
      function(e) {
        if (e) {
          // An error happened!
          throw e;
        }
        // Otherwise, BrowserFS is ready-to-use!
      }
    );
  }

  async run(inputArguments, logger) {
    var logger = logger || console;

    // Note: This "process" call is governed by BrowserFS.
    process.chdir(this.root_dir);

    return new Promise((resolve, reject) => {
      // Make sure we have our environment directory created before continuing.
      // Note: This "fs" call is governed by BrowserFS.
      try {
        fs.mkdirSync(this.root_dir, { recursive: true });
        fs.mkdirSync(this.chain_dir, { recursive: true });

        this.provider = ganache.provider({
          db_path: this.chain_dir,
          network_id: this.chain_id
        });
      } catch (err) {
        if (!err.code || !err.code == "EEXIST") {
          logger.error(err);
          return reject(
            new Error("Couldn't create root directory for Truffle environment!")
          );
        }
      }

      const userWantsGeneralHelp =
        (inputArguments[0] === "help" || inputArguments[0] === "--help") &&
        inputArguments.length === 1;

      if (userWantsGeneralHelp) {
        command.displayGeneralHelp();
        return resolve();
      }

      this.command.run(
        inputArguments,
        {
          working_directory: this.root_dir,
          compilers: {
            solc: {
              browser: true
            }
          },
          networks: {
            development: {
              network_id: this.chain_id,
              provider: this.provider
            }
          },
          logger: logger
        },
        function(err) {
          if (err) {
            if (err instanceof TaskError) {
              command.displayGeneralHelp();
            } else {
              return reject(err);
            }
          }
          return resolve();
        }
      );
    });
  }

  fs() {
    return fs;
  }

  files() {
    return fs.readdirSync(this.root_dir);
  }

  readFile(local_path) {
    return fs.readFileSync(path.join(this.root_dir, local_path), "utf-8");
  }
}

module.exports = Truffle;
