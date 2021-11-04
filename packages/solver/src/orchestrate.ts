import { loadAll } from "js-yaml";
import { readFile } from "fse";
import * as path from "path";

const Solver = {
  orchestrate: async function (filepath) {

    const declarations = loadAll(await readFile(filepath.filepath, "utf8"));
    console.log("declarations! " + JSON.stringify(declarations[0].deployed));

    return [
      {
        contractName: "SimpleStorage",
        network: "development"
      }
    ];
  }
};

module.exports = Solver;
