import type TruffleConfig from "@truffle/config";
import type Resolver from "@truffle/resolver";
import TruffleError from "@truffle/error";

import type { Web3BaseProvider as Provider } from "web3-types";

export interface RequireOptions {
  /**
   * The path to the source file to be required/executed
   */
  file: string;

  /**
   * The `@truffle/config` for the user's project
   */
  config?: TruffleConfig;

  context?: { [key: string]: any };
  resolver?: Resolver;
}

export interface ExecOptions extends TruffleConfig {
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
 * Thrown when the user attempts to execute TypeScript code but hasn't installed
 * `ts-node` and/or one of ts-node's required peer dependencies.
 */
export class TsNodeDependencyError extends TruffleError {
  constructor(sourceFilePath: string) {
    super(
      `Attempted to execute module at path ${sourceFilePath}, but the ` +
        "'ts-node' module, or one of its required peers has not been installed."
    );
  }
}
