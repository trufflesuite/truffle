import fs from "fs";
import path from "path";
import gql from "graphql-tag";
import { TruffleDB } from "truffle-db";
import Ganache from "ganache-core";
import tmp from "tmp";
import * as Contracts from "@truffle/workflow-compile";


jest.mock("@truffle/workflow-compile", () => ({
 compile: function(config, callback) {
   const magicSquare= require(path.join(__dirname,"..", "artifacts", "test", "sources", "MagicSquare.json"));
   const migrations = require(path.join(__dirname, "..", "artifacts", "test", "sources", "Migrations.json"));
   const squareLib = require(path.join(__dirname, "..", "artifacts", "test", "sources", "SquareLib.json"));
   const vyperStorage = require(path.join(__dirname, "..", "artifacts", "test", "sources", "VyperStorage.json"));
   const returnValue = {
    "outputs": {
      "solc": [
        "/Users/fainashalts/solidity-magic-square/contracts/MagicSquare.sol",
        "/Users/fainashalts/solidity-magic-square/contracts/Migrations.sol",
        "/Users/fainashalts/solidity-magic-square/contracts/SquareLib.sol"
      ],
      "vyper": [
        "/Users/fainashalts/truffle-six/testing2/contracts/VyperStorage.vy",
      ]
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
    },
    {
      "contract_name": "VyperStorage",
      ...vyperStorage
    },
    ]
  }
   return returnValue;
 }
}));

const fixturesDirectory = path.join(__dirname, "..", "artifacts", "test");

const tempDir = tmp.dirSync({ unsafeCleanup: true });
tmp.setGracefulCleanup();
// minimal config
const config = {
  contracts_build_directory: path.join(fixturesDirectory, "sources"),
  contracts_directory: path.join(fixturesDirectory, "compilationSources"),
  artifacts_directory: path.join(fixturesDirectory, "compilationSources", "build", "contracts"),
  working_directory: tempDir.name,
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

afterAll(() => {
  tempDir.removeCallback();
});

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
