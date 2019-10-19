import { generateId, Migrations, WorkspaceClient } from './utils';
import { GetSource, AddSource } from './source.graphql'

describe("Source", () => {
  let wsClient, addSourceResult

  const expectedId = generateId({
    contents: Migrations.source,
    sourcePath: Migrations.sourcePath
  });

  const variables = {
    contents: Migrations.source,
    sourcePath: Migrations.sourcePath,
  };

  beforeEach(async() => {
    wsClient = new WorkspaceClient();
    addSourceResult = await wsClient.execute(AddSource, variables);
  })

  test("can be added", async () => {
    expect(addSourceResult).toHaveProperty("sourcesAdd");

    const { sourcesAdd } = addSourceResult;
    expect(sourcesAdd).toHaveProperty("sources");

    const { sources } = sourcesAdd;
    expect(sources).toHaveLength(1);

    const source = sources[0];
    expect(source).toHaveProperty("id");

    const { id } = source;
    expect(id).toEqual(expectedId);

  });

  test("can be queried", async() => {
    const getSourceResult = await wsClient.execute(GetSource, { id: expectedId });
    expect(getSourceResult).toHaveProperty("source");

    const { source } = getSourceResult;
    expect(source).toHaveProperty("id");
    expect(source).toHaveProperty("contents");
    expect(source).toHaveProperty("sourcePath");

    const { id, contents, sourcePath } = source;
    expect(id).toEqual(expectedId);
    expect(contents).toEqual(variables.contents);
    expect(sourcePath).toEqual(variables.sourcePath);

  });

});
