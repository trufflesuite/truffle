import { TezosCompiler, profilerBuilder } from "@truffle/compile-common";
import { LigoCompileStrategy } from "./compileStrategy";
const findContracts = require("@truffle/contract-sources");

const fileExtensions = ["ligo", "mligo", "religo"];

export const Compile = new TezosCompiler(
  new LigoCompileStrategy(),
  profilerBuilder(fileExtensions),
  findContracts);
