import { ArtifactsLoader } from "./artifactsLoader";
export { ArtifactsLoader };
const tmp = require("tmp");
import { makeExecutableSchema } from "@gnd/graphql-tools";
import { gql } from "apollo-server";

const typeDefs = gql`
  type ArtifactsLoadPayload {
    success: Boolean
  }
  type Mutation {
    artifactsLoad: ArtifactsLoadPayload
  }
  type Query {
    dummy: String
  }
`;

const resolvers = {
  Mutation: {
    artifactsLoad: {
      resolve: async (
        _,
        args,
        { artifactsDirectory, contractsDirectory, workingDirectory, db },
        info
      ) => {
        const tempDir = tmp.dirSync({ unsafeCleanup: true });
        tmp.setGracefulCleanup();
        const compilationConfig = {
          contracts_directory: contractsDirectory,
          contracts_build_directory: tempDir.name,
          artifacts_directory: artifactsDirectory,
          working_directory: workingDirectory,
          all: true
        };
        const loader = new ArtifactsLoader(db, compilationConfig);
        await loader.load();
        tempDir.removeCallback();
        return true;
      }
    }
  },
  ArtifactsLoadPayload: {
    success: {
      resolve: () => true
    }
  }
};

export const loaderSchema = makeExecutableSchema({ typeDefs, resolvers });
