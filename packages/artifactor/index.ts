import "source-map-support/register";
import Schema from "@truffle/contract-schema";
import fse from "fs-extra";
import path from "path";
import OS from "os";
import { writeArtifact, finalizeArtifact } from "./utils";
const debug = require("debug")("artifactor");

class Artifactor {
  destination: string;

  constructor(destination: string) {
    this.destination = destination;
  }

  async save(artifactObject: object) {
    const normalizedNewArtifact = Schema.normalize(artifactObject);
    const contractName = normalizedNewArtifact.contractName;

    if (!contractName) throw new Error("You must specify a contract name.");

    const outputPath = path.join(this.destination, `${contractName}.json`);

    try {
      const existingArtifact = fse.readFileSync(outputPath, "utf8"); // check if artifact already exists
      const existingArtifactObject = JSON.parse(existingArtifact); // parse existing artifact
      const normalizedExistingArtifact = Schema.normalize(
        existingArtifactObject
      );

      const completeArtifact = finalizeArtifact(
        normalizedExistingArtifact,
        normalizedNewArtifact
      );
      writeArtifact(completeArtifact, outputPath);
    } catch (e) {
      // if artifact doesn't already exist, write new file
      if (e.code === "ENOENT")
        return writeArtifact(normalizedNewArtifact, outputPath);
      else if (e instanceof SyntaxError) throw e; // catches improperly formatted artifact json
      throw e; // catch all other errors
    }
  }

  async saveAll(artifactObjects: any | Array<object>) {
    let newArtifactObjects: any = {};

    if (Array.isArray(artifactObjects)) {
      const tmpArtifactArray = artifactObjects;
      tmpArtifactArray.forEach(artifactObj => {
        if (newArtifactObjects[artifactObj.contract_name]) {
          console.warn(
            `${OS.EOL}> Duplicate contract names found for ${
              artifactObj.contract_name
            }.${OS.EOL}` +
              `> This can cause errors and unknown behavior. Please rename one of your contracts.`
          );
        }
        newArtifactObjects[artifactObj.contract_name] = artifactObj;
      });
    } else {
      newArtifactObjects = artifactObjects;
    }

    try {
      fse.statSync(this.destination); // check if destination exists
    } catch (e) {
      if (e.code === "ENOENT")
        // if destination doesn't exist, throw error
        throw new Error(`Destination "${this.destination}" doesn't exist!`);
      throw e; // throw on all other errors
    }

    Object.keys(newArtifactObjects).forEach(contractName => {
      let artifactObject = newArtifactObjects[contractName];
      this.save(artifactObject);
    });
  }
}

export = Artifactor;
