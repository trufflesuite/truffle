import * as Compiler from "@truffle/codec/compiler";
import * as Ast from "@truffle/codec/ast";
import { Abi as SchemaAbi } from "@truffle/contract-schema/spec";

//Note to other people passing in compilations:
//Please include all fields you can that aren't
//labeled compatibility hacks.  Those ones are only
//really meant for when I shim up a fake one of these.

export interface Compilations {
  [id: string]: Compilation;
}

export interface Compilation {
  id: string;
  unreliableSourceOrder?: boolean; //compatibility hack!
  sources: Source[];
  contracts: Contract[];
  compiler?: Compiler.CompilerVersion;
}

export interface Source {
  id?: string;
  sourcePath?: string;
  source?: string;
  ast?: Ast.AstNode;
  compiler?: Compiler.CompilerVersion; //compatibility hack!
}

export interface Contract {
  contractName: string;
  bytecode?: string | Bytecode;
  deployedBytecode?: string | Bytecode;
  sourceMap?: string;
  deployedSourceMap?: string;
  abi: SchemaAbi;
  compiler?: Compiler.CompilerVersion; //compatibility hack!
  primarySourceId?: string;
  primarySourceIndex?: number; //compatibility hack!
}

//defining this ourselves for now, sorry!
export interface Bytecode {
  bytes: string;
  linkReferences: {
    offsets: number[];
    name: string;
    length: number;
  }[];
}
