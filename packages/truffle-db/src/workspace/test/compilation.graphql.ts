import gql from "graphql-tag";

export const AddCompilation = gql`
  mutation AddCompilation($compilerName: String!, $compilerVersion: String!, $sourceId: ID!, $abi:String!) {
    compilationsAdd(input: {
      compilations: [{
        compiler: {
          name: $compilerName
          version: $compilerVersion
        }
        contracts: [
        {
          name:"testing",
          ast: {
            json: $abi
          }
          source: {
            id: $sourceId
          }
        }]
        sources: [
          {
           id: $sourceId
          }
        ]
      }]
    }) {
      compilations {
        id
        compiler {
          name
        }
        sources {
          contents
        }
        contracts {
          source {
            contents
            sourcePath
          }
          ast {
            json
          }
          name
        }
      }
    }
  }
`;

export const GetCompilation = gql`
  query GetCompilation($id: ID!) {
    compilation(id: $id) {
      id
      compiler {
        name
        version
      }
      sources {
        id
        contents
      }
      contracts {
        source {
          contents
        }
      }
    }
  }
`;

export const GetAllCompilations = gql`
  query getAllCompilations {
    compilations {
      compiler {
        name
        version
        settings
      }

      sources {
        id
      }
    }
  }
`;
