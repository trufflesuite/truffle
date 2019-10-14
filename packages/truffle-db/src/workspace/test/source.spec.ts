import { generateId, Migrations, WorkspaceClient } from './utils';
import { Query, Mutation } from './queries';

const { GetSource } = Query;
const { AddSource } = Mutation;


describe("Source", () => {
  it("adds source", async () => {
    const client = new WorkspaceClient();

    const expectedId = generateId({
      contents: Migrations.source,
      sourcePath: Migrations.sourcePath
    });
    const variables = {
      contents: Migrations.source,
      sourcePath: Migrations.sourcePath,
    };

    // add source
    {
      const data = await client.execute(AddSource, variables);
      expect(data).toHaveProperty("sourcesAdd");

      const { sourcesAdd } = data;
      expect(sourcesAdd).toHaveProperty("sources");

      const { sources } = sourcesAdd;
      expect(sources).toHaveLength(1);

      const source = sources[0];
      expect(source).toHaveProperty("id");

      const { id } = source;
      expect(id).toEqual(expectedId);
    }

    // ensure retrieved as matching
    {
      const data = await client.execute(GetSource, { id: expectedId });
      expect(data).toHaveProperty("source");

      const { source } = data;
      expect(source).toHaveProperty("id");
      expect(source).toHaveProperty("contents");
      expect(source).toHaveProperty("sourcePath");

      const { id, contents, sourcePath } = source;
      expect(id).toEqual(expectedId);
      expect(contents).toEqual(variables.contents);
      expect(sourcePath).toEqual(variables.sourcePath);
    }
  });
});

