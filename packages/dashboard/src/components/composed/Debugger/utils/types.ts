import type * as Codec from "@truffle/codec";

export type Selector = any;

export type BreakpointType = {
  sourceId: string;
  line: number;
};

export type UnknownAddress = string;

export interface Source {
  id: string;
  sourcePath: string;
  contents: string;
  language: string;
}

export interface SourceRange {
  traceIndex: number;
  source: { id: string };
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number | null;
    column: number | null;
  };
}

export interface Variables {
  [identifier: string]: Codec.Format.Values.Result;
}

export interface Session {
  selectors: any;

  addExternalCompilations(
    compilations: Codec.Compilations.Compilation[]
  ): Promise<void>;

  startFullMode(): Promise<void>;

  view(selector: Selector): any;

  variables(options?: { indicateUnknown?: boolean }): Promise<Variables>;

  continueUntilBreakpoint(): Promise<void>;
  stepNext(): Promise<void>;
  stepOver(): Promise<void>;
  stepInto(): Promise<void>;
  stepOut(): Promise<void>;
  reset(): Promise<void>;
  addBreakpoint(arg: { line: number; sourceId: string }): void;
  removeBreakpoint(arg: { line: number; sourceId: string }): void;
}
