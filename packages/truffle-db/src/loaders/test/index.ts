import fs from "fs";
import path from "path";
import gql from "graphql-tag";

import { TruffleDB } from "truffle-db";


const fixturesDirectory = path.join(__dirname, "..", "artifacts", "test");

// minimal config
const config = {
  contracts_build_directory: path.join(fixturesDirectory, "build"),
  contracts_directory: path.join(fixturesDirectory, "compilationSources"),
  all: true
};

const db = new TruffleDB(config);

const  Build = require(path.join(fixturesDirectory, "build", "SimpleStorage.json"));

const Load = gql `
  mutation LoadArtifacts {
    loaders {
      artifactsLoad {
        success
      }
    }
  }
` 

it("loads artifacts and returns true ", async () => {
  const {
    data: {
      loaders: {
        artifactsLoad: {
          success
        }
      }
    }
  } = await db.query(Load);
  expect(success).toEqual(true); 
});
