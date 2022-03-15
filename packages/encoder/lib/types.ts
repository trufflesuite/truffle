import type { Provider } from "./adapter";
import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import type { Compilations, Format, Evm } from "@truffle/codec";
import type * as Codec from "@truffle/codec";
import type * as Abi from "@truffle/abi-utils";
import type Web3 from "web3";

/**
 * This type contains options to be used when preparing transactions
 * or resolving overloads.  Currently the only allowed option is one for
 * whether to allow a transaction options argument on the end.
 * @Category Inputs
 */
export interface ResolveOptions {
  /**
   * This field, if set to true, allows an optional transaction options
   * argument after the other arguments.
   */
  allowOptions?: boolean;
}

/**
 * This type is a pair containing both a set of transaction options (as might
 * be sent to web3), including `data`, and an ABI for that transaction.  Only
 * function transactions are covered here at the moment, because this is meant
 * to be used with overload resolution as the return type.
 * @Category Inputs
 */
export interface TxAndAbi {
  /**
   * This field holds the transaction options.
   */
  tx: Codec.Options;
  /**
   * This field holds the ABI for the transaction.  Because this is intended
   * as a return type for overload resolution, only function ABI entries can go
   * here.
   */
  abi: Abi.FunctionEntry;
}

/**
 * @hidden
 * @Category Inputs
 */
export interface EncoderInfoInternal {
  userDefinedTypes?: Format.Types.TypesById;
  allocations?: Evm.AllocationInfo;
  compilations?: Compilations.Compilation[];
  networkId?: number | null;
  provider?: Provider | null;
  registryAddress?: string;
}

//warning: copypasted from @truffle/decoder!
/**
 * This type contains information needed to initialize the encoder.
 * @Category Inputs
 */
export interface EncoderSettings {
  /**
   * Information about the project or contracts being decoded.
   * This may come in several forms; see the type documentation for
   * more information.  The simplest way to use this to set it to
   * `{ artifacts: <array of artifacts in project> }`.
   *
   * This may be left out if an artifact or contract has been passed
   * in by some other means, in which case the encoder will be made
   * based purely on that single contract, but it's recommended to pass in
   * project info for all your contracts to get the encoder's full power.
   */
  projectInfo?: Compilations.ProjectInfo;
  /**
   * Optionally include a provider; if given, this allows the encoder to know
   * the current network ID and thereby perform any necessary library linking
   * when encoding a contract creation.  If you attempt to encode a contract
   * creation transaction for a contract that still has unlinked libraries,
   * and do not provide the information needed to link them, an exception will
   * be thrown.
   *
   * There is no need to include this when using a Truffle Contract based
   * constructor, as it will use the contract's provider, but if you do include
   * it, it will override that provider.
   *
   * Including this will also turn on ENS resolution unless it is turned off in
   * the ENS settings (see below).
   */
  provider?: Provider;
  /**
   * Optionally include a network ID; this is used for the same purposes as the
   * provider (see above), but won't turn on ENS resolution.
   *
   * There is no need to include this when using a Truffle Contract based
   * constructor, as it will use the contract's network ID, but if you do include
   * it, it will override that network ID.
   *
   * If this is passed in addition to provider, this network ID will override the
   * one from provider.
   */
  networkId?: number;
  /**
   * This field can be included to enable or disable ENS resolution and specify
   * how it should be performed.  If absent, but a provider was given above,
   * ENS resolution will be performed using that.
   */
  ens?: EnsSettings;
}

/**
 * This type indicates settings to be used for ENS resolution.
 * @Category Inputs
 */
export interface EnsSettings {
  /**
   * The provider to use for ENS resolution; set this to `null` to disable
   * ENS resolution.  If absent, will default to the encoders's usual provider,
   * if there is one, or to `null`, if not.
   */
  provider?: Provider | null;
  /**
   * The ENS registry address to use; if absent, will use the default one
   * for the current network.  If there is no default registry for the
   * current network, ENS resolution will be disabled.
   */
  registryAddress?: string;
}

//HACK
export interface ContractConstructorObject extends Artifact {
  network_id: string; //also getter
  web3: Web3;
}

//HACK
export interface ContractInstanceObject {
  constructor: ContractConstructorObject;
  address: string;
}
