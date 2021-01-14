import { ContractObject } from "@truffle/contract-schema/spec";

export interface ResolverSource {
  require(importPath: string, searchPath?: string): ContractObject | null;
  resolve(importPath: string, importedFrom: string): Promise<SourceResolution>;
  resolveDependencyPath(importPath: string, dependencyPath: string): string | null | Promise<string | null>;
}

export interface SourceResolution {
  body: string | undefined;
  filePath: string | undefined;
}
