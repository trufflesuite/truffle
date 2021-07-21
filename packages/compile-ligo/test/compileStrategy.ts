import { TezosCompiledContract } from "@truffle/compile-common";
import Config from "@truffle/config";
const Resolver = require("@truffle/resolver");
import assert from "assert";
import path from "path";
import sinon from "sinon";

import { Compile } from "../src/index";
import * as CompileLigo from "../src/compile";

const sourcesDirectory = path.join(__dirname, "./sources/");

describe("ligo compiler", function () {
  this.timeout(20000);

  const sandbox = sinon.createSandbox();

  const defaultSettings = {
    contracts_directory: sourcesDirectory,
    quiet: true,
    all: true,
  };
  const config = new Config().merge(defaultSettings);
  config.resolver = new Resolver(config);

  beforeEach(function () {
    sandbox.stub(CompileLigo, "compile").resolves(compilerResult);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("compiles ligo contract", async function () {
    const { compilations } = await Compile.all(config);
    const { contracts, sourceIndexes } = compilations[0];

    sourceIndexes.forEach(path => {
      assert(path.endsWith(".ligo") || path.endsWith(".religo") || path.endsWith(".mligo"), "Paths have only ligo files");
    });

    contracts.forEach(contract => {
      assert.strictEqual(contract.architecture, "tezos", "Contract architecture is tezos");
      assert(contract.compiler.name.includes("ligo"), "Compiler name is correct");
      assert.doesNotThrow(() => JSON.parse((contract as TezosCompiledContract).michelson), "Generates valid Michelson");
    });

    assert.strictEqual(contracts.length, 3, "Correct number of contracts compiled. Skips other extensions.");
  });
});

const compilerResult = {
  results: [
    {
      sourcePath: `${sourcesDirectory}/IncrementCamel.mligo`,
      michelson: '[ { "prim": "parameter",\n' +
        '    "args":\n' +
        '      [ { "prim": "or",\n' +
        '          "args":\n' +
        '            [ { "prim": "or",\n' +
        '                "args":\n' +
        '                  [ { "prim": "int", "annots": [ "%decrement" ] },\n' +
        '                    { "prim": "int", "annots": [ "%increment" ] } ] },\n' +
        '              { "prim": "unit", "annots": [ "%reset" ] } ] } ] },\n' +
        '  { "prim": "storage", "args": [ { "prim": "int" } ] },\n' +
        '  { "prim": "code",\n' +
        '    "args":\n' +
        '      [ [ { "prim": "DUP" }, { "prim": "CDR" }, { "prim": "SWAP" },\n' +
        '          { "prim": "CAR" },\n' +
        '          { "prim": "IF_LEFT",\n' +
        '            "args":\n' +
        '              [ [ { "prim": "IF_LEFT",\n' +
        '                    "args":\n' +
        '                      [ [ { "prim": "SWAP" }, { "prim": "SUB" } ],\n' +
        '                        [ { "prim": "ADD" } ] ] } ],\n' +
        '                [ { "prim": "DROP", "args": [ { "int": "2" } ] },\n' +
        '                  { "prim": "PUSH",\n' +
        '                    "args": [ { "prim": "int" }, { "int": "0" } ] } ] ] },\n' +
        '          { "prim": "NIL", "args": [ { "prim": "operation" } ] },\n' +
        '          { "prim": "PAIR" } ] ] } ]'
    },
    {
      sourcePath: `${sourcesDirectory}/IncrementPascal.ligo`,
      michelson: '[ { "prim": "parameter",\n' +
        '    "args":\n' +
        '      [ { "prim": "or",\n' +
        '          "args":\n' +
        '            [ { "prim": "or",\n' +
        '                "args":\n' +
        '                  [ { "prim": "int", "annots": [ "%decrement" ] },\n' +
        '                    { "prim": "int", "annots": [ "%increment" ] } ] },\n' +
        '              { "prim": "unit", "annots": [ "%reset" ] } ] } ] },\n' +
        '  { "prim": "storage", "args": [ { "prim": "int" } ] },\n' +
        '  { "prim": "code",\n' +
        '    "args":\n' +
        '      [ [ { "prim": "DUP" }, { "prim": "CDR" }, { "prim": "SWAP" },\n' +
        '          { "prim": "CAR" },\n' +
        '          { "prim": "IF_LEFT",\n' +
        '            "args":\n' +
        '              [ [ { "prim": "IF_LEFT",\n' +
        '                    "args":\n' +
        '                      [ [ { "prim": "SWAP" }, { "prim": "SUB" } ],\n' +
        '                        [ { "prim": "ADD" } ] ] } ],\n' +
        '                [ { "prim": "DROP", "args": [ { "int": "2" } ] },\n' +
        '                  { "prim": "PUSH",\n' +
        '                    "args": [ { "prim": "int" }, { "int": "0" } ] } ] ] },\n' +
        '          { "prim": "NIL", "args": [ { "prim": "operation" } ] },\n' +
        '          { "prim": "PAIR" } ] ] } ]'
    },
    {
      sourcePath: `${sourcesDirectory}/IncrementReason.religo`,
      michelson: '[ { "prim": "parameter",\n' +
        '    "args":\n' +
        '      [ { "prim": "or",\n' +
        '          "args":\n' +
        '            [ { "prim": "or",\n' +
        '                "args":\n' +
        '                  [ { "prim": "int", "annots": [ "%decrement" ] },\n' +
        '                    { "prim": "int", "annots": [ "%increment" ] } ] },\n' +
        '              { "prim": "unit", "annots": [ "%reset" ] } ] } ] },\n' +
        '  { "prim": "storage", "args": [ { "prim": "int" } ] },\n' +
        '  { "prim": "code",\n' +
        '    "args":\n' +
        '      [ [ { "prim": "DUP" }, { "prim": "CDR" }, { "prim": "SWAP" },\n' +
        '          { "prim": "CAR" },\n' +
        '          { "prim": "IF_LEFT",\n' +
        '            "args":\n' +
        '              [ [ { "prim": "IF_LEFT",\n' +
        '                    "args":\n' +
        '                      [ [ { "prim": "SWAP" }, { "prim": "SUB" } ],\n' +
        '                        [ { "prim": "ADD" } ] ] } ],\n' +
        '                [ { "prim": "DROP", "args": [ { "int": "2" } ] },\n' +
        '                  { "prim": "PUSH",\n' +
        '                    "args": [ { "prim": "int" }, { "int": "0" } ] } ] ] },\n' +
        '          { "prim": "NIL", "args": [ { "prim": "operation" } ] },\n' +
        '          { "prim": "PAIR" } ] ] } ]'
    }
  ],
  compilerDetails: { name: 'ligo', version: 'next' }
};
