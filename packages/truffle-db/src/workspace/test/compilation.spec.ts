import { generateId, Migrations, WorkspaceClient } from './utils';
import { Query, Mutation } from './queries';

const { AddSource } = Mutation;

/*
 * Compilation
 */

const { GetCompilation } = Query;
const { AddCompilation } = Mutation;

describe("Compilation", () => {
  const client = new WorkspaceClient();

  let sourceId;

  beforeEach(async () => {
    //add source and get id
    const sourceVariables = {
      contents: Migrations.source,
      sourcePath: Migrations.sourcePath
    };
    const sourceResult = await client.execute(AddSource, sourceVariables);
    sourceId = sourceResult.sourcesAdd.sources[0].id;
  });

  it("adds compilation", async () => {
    const expectedId = generateId({
      compiler: Migrations.compiler,
      sourceIds: [{ id: sourceId }]
    });

    const variables = {
      compilerName: Migrations.compiler.name,
      compilerVersion: Migrations.compiler.version,
      sourceId: sourceId,
      abi: JSON.stringify(Migrations.abi)
    };

  // add compilation
    {
      const data = await client.execute(AddCompilation, variables);
      expect(data).toHaveProperty("compilationsAdd");

      const { compilationsAdd } = data;
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
    }
      //ensure retrieved as matching
    {
      const data = await client.execute(GetCompilation, { id: expectedId });
      expect(data).toHaveProperty("compilation");

      const { compilation } = data;
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
    }
  });
});
