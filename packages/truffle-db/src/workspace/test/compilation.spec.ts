import gql from "graphql-tag";
import { generateId, Migrations, WorkspaceClient } from './utils';
import { AddSource } from './source.spec';

describe("Compilation", () => {
  const wsClient = new WorkspaceClient();

  let sourceId
  let variables, addCompilationResult

  beforeEach(async () => {
    //add source and get id
    const sourceVariables = {
      contents: Migrations.source,
      sourcePath: Migrations.sourcePath
    };
    const sourceResult = await wsClient.execute(AddSource, sourceVariables);
    sourceId = sourceResult.sourcesAdd.sources[0].id;

    variables = {
      compilerName: Migrations.compiler.name,
      compilerVersion: Migrations.compiler.version,
      sourceId: sourceId,
      abi: JSON.stringify(Migrations.abi)
    };
    addCompilationResult = await wsClient.execute(AddCompilation, variables);

  });

  test("can be added", async() => {
    expect(addCompilationResult).toHaveProperty("compilationsAdd");

    const { compilationsAdd } = addCompilationResult;
    expect(compilationsAdd).toHaveProperty("compilations");

    const { compilations } = compilationsAdd;
    expect(compilations).toHaveLength(1);

    for (let compilation of compilations) {
      expect(compilation).toHaveProperty("compiler");
      expect(compilation).toHaveProperty("sources");
      const { compiler, sources, contracts } = compilation;

      expect(compiler).toHaveProperty("name");

      expect(sources).toHaveLength(1);
      for (let source of sources) {
        expect(source).toHaveProperty("contents");
      }

      expect(contracts).toHaveLength(1);

      for(let contract of contracts) {
        expect(contract).toHaveProperty("source");
        expect(contract).toHaveProperty("name");
        expect(contract).toHaveProperty("ast");
      }
    }
  });

  test("can be queried", async() => {
    const expectedId = generateId({
      compiler: Migrations.compiler,
      sourceIds: [{ id: sourceId }]
    });

    const getCompilationResult = await wsClient.execute(GetCompilation, { id: expectedId });
    expect(getCompilationResult).toHaveProperty("compilation");

    const { compilation } = getCompilationResult;
    expect(compilation).toHaveProperty("id");
    expect(compilation).toHaveProperty("compiler");
    expect(compilation).toHaveProperty("sources");

    const { sources } = compilation;

    for (let source of sources) {
      expect(source).toHaveProperty("id");
      const { id } = source;
      expect(id).not.toBeNull();
      expect(source).toHaveProperty("contents");
      const { contents } = source;
      expect(contents).not.toBeNull();
    }
  });
});

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
