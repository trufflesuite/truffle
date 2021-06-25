import { TezosCompiler } from "@truffle/compile-common";
import { MichelsonCompileStrategy } from "./compileStrategy";

export const Compile = new TezosCompiler(new MichelsonCompileStrategy());
