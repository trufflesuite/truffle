import { TezosCompiler, profilerBuilder } from "@truffle/compile-common";
import { MichelsonCompileStrategy } from "./compileStrategy";
const findContracts = require("@truffle/contract-sources");

const fileExtensions = ["tz"];

export const Compile = new TezosCompiler(
  new MichelsonCompileStrategy(),
  profilerBuilder(fileExtensions),
  findContracts);
