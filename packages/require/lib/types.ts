import TruffleConfig from "@truffle/config";
import Resolver from "@truffle/resolver";
import TruffleError from "@truffle/error";

export interface RequireOptions {
  /**
   * The path to the source file to be required/executed
   */
  file: string;

  /**
   * The `@truffle/config` for the user's project
   */
  config: TruffleConfig;
}

export interface ExecOptions {
  contracts_build_directory: string;
  /**
   * Path to file to execute. Must be a module that exports a function.
   */
  file: string;

  /**
   * Object containing any global variables you'd like set when this function is
   * run.
   */
  context: {
    [index: string]: any;
  };

  /**
   * The instance of `@truffle/resolver` to be passed into the global context
   * when executing the script
   */
  resolver: Resolver;

  /**
   * The JSON RPC provider that will be used by the interface-adpater and web3
   * instance injected into the script
   */
  provider: Provider;

  /**
   * A reference to a network defined in the user's `@truffle/config`.
   */
  network: string;

  /**
   * The id of the network as reported by the `net_version` JSON RPC method.
   */
  network_id: string | number;

  /**
   * The configuration for any networks that may be referenced by the script
   * being executed.
   */
  networks: {
    [index: string]: {
      type: string; // likely "ethereum", but not guaranteed
    };
  };
}

/**
 * The body of a valid JSON RPC request
 */
interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params: any[];
  id: number;
}

/**
 * The body of a valid JSON RPC response
 */
export interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: string;
}

/**
 * A callback that is used by web3 and similar to get the result of a JSON RPC
 * request.
 */
export interface JsonRpcCallback {
  (error: Error): void;
  (error: null, val: JsonRpcResponse): void;
}

/**
 * Minimal representation of a provider object that can be used by this module
 */
export interface Provider {
  send(payload: JsonRpcRequest, callback: JsonRpcCallback): any;
}

/**
 * Thrown when the user attempts to execute TypeScript code but hasn't installed
 * `ts-node` and/or one of ts-node's required peer dependencies.
 */
export class TsNodeDependencyError extends TruffleError {
  constructor(extension: string) {
    super(
      `Attempted to execute script with extension ${extension}, but the ` +
        "'ts-node' module, or one of its required peers has not been installed."
    );
  }
}
