import fs from "fs";
import path from "path";

import gql from "graphql-tag";
import { TruffleDB } from "truffle-db";
import { ArtifactsLoader } from "truffle-db/loaders/artifacts";
const pointer = require("json-pointer");


import { generateId } from "test/helpers";

const fixturesDirectory = path.join(__dirname, "sources");

// minimal config
const config = {
  contracts_build_directory: fixturesDirectory
};

const db = new TruffleDB(config);
const Migrations = require(path.join(fixturesDirectory, "Migrations.json"));

const GetWorkspaceBytecode: boolean = gql`
query GetWorkspaceBytecode($id: ID!) {
  workspace {
    bytecode(id: $id) {
      id
      bytes
    }
  }
}`;

it("loads create bytecodes", async () => {
  // arrange
  const expectedId = generateId({ bytes: Migrations.bytecode })
  const loader = new ArtifactsLoader(db);

  // act
  await loader.load();

  // assert
  const {
    data: {
      workspace: {
        bytecode: {
          bytes
        }
      }
    }
  } = await db.query(GetWorkspaceBytecode, { id: expectedId });

  expect(bytes).toEqual(Migrations.bytecode);
});

const GetWorkspaceSource: boolean = gql`
query GetWorkspaceSource($id: ID!) {
  workspace {
    source(id: $id) {
      id
      contents
    }
  }
}`;


it("loads contract sources", async () => {
  // arrange
  const expectedId = generateId({
    contents: Migrations.source,
    sourcePath: Migrations.sourcePath
  });
  const loader = new ArtifactsLoader(db);

  // act
  await loader.load();

  // assert
  const {
    data: {
      workspace: {
        source: {
          contents
        }
      }
    }
  } = await db.query(GetWorkspaceSource, { id: expectedId });

  expect(contents).toEqual(Migrations.source);
});
