import { CompilerResult, ICompileStrategy } from "@truffle/compile-common";
import { compile } from "./compile";
import { compileAdapter } from "./compileAdapter";

export class LigoCompileStrategy implements ICompileStrategy {
  public fileExtensions = ["ligo", "mligo", "religo"];

  public async compile(paths: string[]): Promise<CompilerResult> {
    const ligoCompilerResult = await compile(paths);
    return compileAdapter(ligoCompilerResult);
  }
}
