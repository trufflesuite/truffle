import { generateId, Migrations, WorkspaceClient } from "./utils";
import { AddSource, GetSource, GetAllSources } from "./source.graphql";

describe.skip("Source", () => {
  let wsClient, addSourceResult;

  const expectedId = generateId("sources", {
    contents: Migrations.source,
    sourcePath: Migrations.sourcePath
  });

  const variables = {
    contents: Migrations.source,
    sourcePath: Migrations.sourcePath
  };

  beforeEach(async () => {
    wsClient = new WorkspaceClient();
    addSourceResult = await wsClient.execute(AddSource, variables);
  });

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

  test("can be queried", async () => {
    const getSourceResult = await wsClient.execute(GetSource, {
      id: expectedId
    });

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

  test("can retrieve all sources", async () => {
    const getAllSourcesResult = await wsClient.execute(GetAllSources, {});

    expect(getAllSourcesResult).toHaveProperty("sources");

    const { sources } = getAllSourcesResult;
    expect(sources).toHaveProperty("length");

    const firstSource = sources[0];

    expect(firstSource).toHaveProperty("id");
    expect(firstSource).toHaveProperty("contents");
    expect(firstSource).toHaveProperty("sourcePath");
  });
});
