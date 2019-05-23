import fs from "fs";
import path from "path";
import gql from "graphql-tag";
import { TruffleDB } from "truffle-db";
import * as Contracts from "truffle-workflow-compile";

jest.mock("truffle-workflow-compile", () => ({
 compile: function(config, callback) {
   const magicSquare= require(path.join(__dirname,"..", "artifacts", "test", "sources", "MagicSquare.json"));
   const migrations = require(path.join(__dirname, "..", "artifacts", "test", "sources", "Migrations.json"));
   const squareLib = require(path.join(__dirname, "..", "artifacts", "test", "sources", "SquareLib.json"));
   const returnValue = {
    "outputs": {
      "solc": [
        "/Users/fainashalts/pet-shop-tutorial/contracts/Adoption.sol",
        "/Users/fainashalts/pet-shop-tutorial/contracts/Migrations.sol"
      ],
      "vyper": []
    },
    "contracts": [{
      "contract_name": "MagicSquare",
      ...magicSquare
    },
    {
      "contract_name": "Migrations",
      ...migrations
    },
    {
      "contract_name": "SquareLib",
      ...squareLib
    }
    ]
  }
   return returnValue;
 }
}));

const fixturesDirectory = path.join(__dirname, "..", "artifacts", "test");

// minimal config
const config = {
  contracts_build_directory: path.join(fixturesDirectory, "sources"),
  contracts_directory: path.join(fixturesDirectory, "compilationSources"),
  all: true
};

const db = new TruffleDB(config);

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
