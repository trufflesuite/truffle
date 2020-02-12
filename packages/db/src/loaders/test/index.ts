import fs from "fs";
import path from "path";
import gql from "graphql-tag";
import { TruffleDB } from "@truffle/db";
import * as Contracts from "@truffle/workflow-compile/new";
import Ganache from "ganache-core";
import tmp from "tmp";

jest.mock("@truffle/workflow-compile/new", () => ({
  compile: function(config, callback) {
    return require(path.join(
      __dirname,
      "..",
      "artifacts",
      "test",
      "workflowCompileOutputMock",
      "compilationOutput.json"
    ));
  }
}));

const fixturesDirectory = path.join(__dirname, "..", "artifacts", "test");

const tempDir = tmp.dirSync({ unsafeCleanup: true });
tmp.setGracefulCleanup();
// minimal config
const config = {
  contracts_build_directory: path.join(
    fixturesDirectory,
    "compilationSources",
    "build",
    "contracts"
  ),
  contracts_directory: path.join(fixturesDirectory, "compilationSources"),
  artifacts_directory: path.join(
    fixturesDirectory,
    "compilationSources",
    "build",
    "contracts"
  ),
  working_directory: tempDir.name,
  all: true
};

const db = new TruffleDB(config);

const Load = gql`
  mutation LoadArtifacts {
    loaders {
      artifactsLoad {
        success
      }
    }
  }
`;

afterAll(() => {
  tempDir.removeCallback();
});

it("loads artifacts and returns true ", async () => {
  const {
    data: {
      loaders: {
        artifactsLoad: { success }
      }
    }
  } = await db.query(Load);
  expect(success).toEqual(true);
});
