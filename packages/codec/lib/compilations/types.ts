import type * as Compiler from "@truffle/codec/compiler";
import type { AstNode } from "@truffle/codec/ast/types";
import type {
  Abi as SchemaAbi,
  ImmutableReferences,
  ContractObject as Artifact
} from "@truffle/contract-schema/spec";
import type * as Common from "@truffle/compile-common";

//Note to other people passing in compilations:
//Please include all fields you can that aren't
//labeled compatibility hacks.  Those ones are only
//really meant for when I shim up a fake one of these.

/**
 * An individual compilation.
 */
export interface Compilation {
  /**
   * The compilation's ID.
   */
  id: string;
  /**
   * This field is a compatibility hack only intended for internal use.  It indicates
   * that the order on the sources should be disregarded and disables functionality
   * that relies on such an order.  (E.g., the debugger will throw an exception if
   * this is set.)
   */
  unreliableSourceOrder?: boolean; //compatibility hack!
  /**
   * A list of sources involved in the compilation.  These must be ordered according
   * to their compilation indices.  (If there is for some reason a gap in the
   * compilation indices, a corresponding gap must be left in the sources array.)
   */
  sources: Source[];
  /**
   * A list of contracts involved in the compilation.
   */
  contracts: Contract[];
  /**
   * The compiler used in the compilation.  For internal compatibility
   * purposes, this may technically be left out if the compiler is instead
   * specified on each source and contract, but please don't actually do that.
   */
  compiler?: Compiler.CompilerVersion;
  /**
   * The settings used in the compilation.  Works similarly to the compiler field.
   * May be omitted.
   */
  settings?: Compiler.Settings;
}

/**
 * Represents a source in a compilation.
 */
export interface Source {
  /**
   * The source's ID.  For internal compatibility purposes, this may technically
   * be left out, but please include it.
   */
  id?: string;
  /**
   * The source's file path.  If internal is true, will not be a real file path but
   * rather just an arbitrary name.
   */
  sourcePath?: string;
  /**
   * The source text.
   */
  source?: string;
  /**
   * The language for the source file.  For compatibility purposes, this may technicaly
   * be left out, but please include it.
   */
  language?: string;
  /**
   * The source's abstract syntax tree.
   */
  ast?: AstNode;
  /**
   * This field is a compatibility hack only intended for internal use.
   * (It allows the compiler to be set on a source if none is set on the
   * compilation as a whole; please don't do that.)
   */
  compiler?: Compiler.CompilerVersion; //compatibility hack!
  /**
   * This field is a compatibility hack only intended for internal use.
   * (It allows the settings to be set on a source if none is set on the
   * compilation as a whole; please don't do that.)
   */
  settings?: Compiler.Settings; //compatibility hack!
}

/**
 * Represents a contract in a compilation.
 */
export interface Contract {
  /**
   * The contract's name.
   */
  contractName: string;
  /**
   * The contract's constructor bytecode; may be given either as a string
   * in the old artifacts format, or as a bytecode object in the new
   * compilation format.
   */
  bytecode?: string | Common.Bytecode;
  /**
   * The contract's deployed bytecode; may be given either as a string
   * in the old artifacts format, or as a bytecode object in the new
   * compilation format.
   */
  deployedBytecode?: string | Common.Bytecode;
  /**
   * The contract's constructor source map.
   */
  sourceMap?: string | VyperSourceMap;
  /**
   * The contract's deployed source map.
   */
  deployedSourceMap?: string | VyperSourceMap;
  /**
   * The contract's ABI.
   */
  abi: SchemaAbi;
  /**
   * The contract's immutable references object as output by Solidity 0.6.5
   * or later.
   */
  immutableReferences?: ImmutableReferences;
  /**
   * This field is a compatibility hack only intended for internal use.
   * (It allows the compiler to be set on a source if none is set on the
   * compilation as a whole; please don't do that.)
   */
  compiler?: Compiler.CompilerVersion; //compatibility hack!
  /**
   * This field is a compatibility hack only intended for internal use.
   * (It allows the settings to be set on a source if none is set on the
   * compilation as a whole; please don't do that.)
   */
  settings?: Compiler.Settings; //compatibility hack!
  /**
   * The ID of the contract's primary source.
   */
  primarySourceId?: string;
  /**
   * The contract's generated sources object as output by Solidity 0.7.2 or later.
   * Note that this will be a sparse array.
   */
  generatedSources?: Source[];
  /**
   * The contract's deployed generated sources object as output by Solidity 0.7.2 or later.
   * Note that this will be a sparse array.
   */
  deployedGeneratedSources?: Source[];
}

export interface VyperSourceMap {
  //breakpoints field is omitted because I don't understand it
  //pc_breakpoints field is omitted because I don't understand it
  pc_jump_map: {
    [pc: number]: "-" | "i" | "o";
  };
  pc_pos_map: {
    [pc: number]: [number, number, number, number];
  };
  pc_pos_map_compressed?: string;
}

/**
 * This type represents information about a Truffle project that can be used to
 * construct and initialize a encoder or decoder for that project.  This
 * information may be passed in various ways; this is done Javascript style,
 * where you pass an object and the field you use indicates which way you're
 * using.
 *
 * The old option to use `config` is no longer supported.
 */
export type ProjectInfo =
  | ProjectInfoCompilations
  | ProjectInfoCommon
  | ProjectInfoArtifacts;

/**
 * Project info given as codec-style compilations.
 */
export interface ProjectInfoCompilations {
  /**
   * An list of codec-style compilations; this method of specifying a project
   * is mostly intended for internal Truffle use for now, but you can see the
   * documentation of the Compilation type if you want to use it.
   */
  compilations?: Compilation[];
}

/**
 * Project info given as compile-common-style compilations.
 */
export interface ProjectInfoCommon {
  /**
   * An list of @truffle/compile-common style compilations; this method of
   * specifying a project is mostly intended for internal Truffle use for now,
   * but you can see the documentation of the that type if you want to
   * use it.
   */
  commonCompilations?: Common.Compilation[];
}

/**
 * Project info given as artifacts.
 */
export interface ProjectInfoArtifacts {
  /**
   * A list of contract artifacts for contracts in the project.
   * Contract constructor objects may be substituted for artifacts, so if
   * you're not sure which you're dealing with, it's OK.
   */
  artifacts?: Artifact[];
}
