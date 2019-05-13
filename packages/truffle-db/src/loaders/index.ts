import { TruffleDB } from "truffle-db";
import { ArtifactsLoader } from "./artifacts";
import { schema as rootSchema } from "truffle-db/schema";
import { Workspace, schema } from "truffle-db/workspace";
const tmp = require("tmp");
import {
  makeExecutableSchema
} from "@gnd/graphql-tools";
import { gql } from "apollo-server";

//dummy query here because of known issue with Apollo mutation-only schemas 
const typeDefs = gql`
  type Mutation {
    loadArtifacts: Boolean
  }
  type Query {
    dummy: String
  }
`;

const resolvers = {
  Mutation: {
    loadArtifacts: {
      resolve: async (_, args, { artifactsDirectory, contractsDirectory, db }, info) => {
        const compilationConfig = {
          contracts_directory: contractsDirectory,
          contracts_build_directory: tmp.dirSync({ unsafeCleanup: true }),
          all: true
        }
      
        const loader = new ArtifactsLoader(db, compilationConfig);
        loader.load();
      } 
    }
  }
}

export const loaderSchema = makeExecutableSchema({ typeDefs, resolvers });
