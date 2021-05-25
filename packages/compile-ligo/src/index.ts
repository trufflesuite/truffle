import { TezosCompiler } from "@truffle/compile-common";
import { LigoCompileStrategy } from "./compileStrategy";

export const Compile = new TezosCompiler(new LigoCompileStrategy());
