import { generateId, Migrations, WorkspaceClient } from "./utils";
import { AddSource } from "./source.graphql";
import {
  AddCompilation,
  GetCompilation,
  GetAllCompilations
} from "./compilation.graphql";
import { Shims } from "@truffle/compile-common";

describe("Compilation", () => {
  const wsClient = new WorkspaceClient();

  let sourceId;
  let variables, addCompilationResult;

  beforeEach(async () => {
    //add source and get id
    const sourceVariables = {
      contents: Migrations.source,
      sourcePath: Migrations.sourcePath
    };
    const sourceResult = await wsClient.execute(AddSource, sourceVariables);
    sourceId = sourceResult.sourcesAdd.sources[0].id;

    const shimmedBytecode = Shims.LegacyToNew.forBytecode(Migrations.bytecode);
    const bytecodeExpectedId = generateId("bytecodes", shimmedBytecode);

    variables = {
      compilerName: Migrations.compiler.name,
      compilerVersion: Migrations.compiler.version,
      sourceId: sourceId,
      bytecodeId: "",
      abi: JSON.stringify(Migrations.abi),
      sourceMap: JSON.stringify(Migrations.sourceMap),
      language: "Solidity",
      astNode: "1",
      length: 5,
      offset: 16,
      contractBytecodeId: bytecodeExpectedId
    };
    addCompilationResult = await wsClient.execute(AddCompilation, variables);
  });

  test("can be added", async () => {
    expect(addCompilationResult).toHaveProperty("compilationsAdd");

    const { compilationsAdd } = addCompilationResult;
    expect(compilationsAdd).toHaveProperty("compilations");

    const { compilations } = compilationsAdd;
    expect(compilations).toHaveLength(1);

    for (let compilation of compilations) {
      expect(compilation).toHaveProperty("compiler");
      expect(compilation).toHaveProperty("sources");
      const {
        compiler,
        sources,
        processedSources,
        immutableReferences
      } = compilation;

      expect(compiler).toHaveProperty("name");

      expect(sources).toHaveLength(1);
      for (let source of sources) {
        expect(source).toHaveProperty("contents");
      }

      expect(processedSources).toHaveLength(1);

      for (let processedSource of processedSources) {
        expect(processedSource).toHaveProperty("source");
        expect(processedSource).toHaveProperty("ast");
        expect(processedSource).toHaveProperty("language");
      }
      expect(immutableReferences).toHaveLength(1);
      expect(immutableReferences[0].astNode).toEqual(variables.astNode);
      expect(immutableReferences[0].offsets).toHaveLength(1);
      expect(immutableReferences[0].length).toEqual(variables.length);
      expect(immutableReferences[0].offsets[0]).toEqual(variables.offset);
    }
  });

  test("can be queried", async () => {
    const expectedId = generateId("compilations", {
      compiler: Migrations.compiler,
      sources: [{ id: sourceId }]
    });

    const getCompilationResult = await wsClient.execute(GetCompilation, {
      id: expectedId
    });

    expect(getCompilationResult).toHaveProperty("compilation");

    const { compilation } = getCompilationResult;
    expect(compilation).toHaveProperty("id");
    expect(compilation).toHaveProperty("compiler");
    expect(compilation).toHaveProperty("sources");

    const { sources, immutableReferences } = compilation;

    for (let source of sources) {
      expect(source).toHaveProperty("id");
      const { id } = source;
      expect(id).not.toBeNull();
      expect(source).toHaveProperty("contents");
      const { contents } = source;
      expect(contents).not.toBeNull();
    }

    expect(immutableReferences).toHaveLength(1);
    expect(immutableReferences[0].astNode).toEqual(variables.astNode);
    expect(immutableReferences[0].offsets).toHaveLength(1);
    expect(immutableReferences[0].length).toEqual(variables.length);
    expect(immutableReferences[0].offsets[0]).toEqual(variables.offset);
  });

  test("can retrieve all compilations", async () => {
    const allCompilationsResult = await wsClient.execute(
      GetAllCompilations,
      {}
    );

    expect(allCompilationsResult).toHaveProperty("compilations");

    const { compilations } = allCompilationsResult;
    expect(compilations).toHaveProperty("length");

    const firstCompilation = compilations[0];

    expect(firstCompilation).toHaveProperty("compiler");
    expect(firstCompilation).toHaveProperty("sources");
    expect(firstCompilation).toHaveProperty("sources.0.id");
  });
});
