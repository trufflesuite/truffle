import debugModule from "debug";
const debug = debugModule("encoder:encoders");

import { FixedNumber as EthersFixedNumber } from "@ethersproject/bignumber";
import { getAddress } from "@ethersproject/address";
import * as Codec from "@truffle/codec";
import * as Abi from "@truffle/abi-utils";
import * as Types from "./types";
import Big from "big.js";
import type { Provider } from "web3/providers";
import Web3 from "web3";
import * as Utils from "./utils";
import {
  NoInternalInfoError,
  UnlinkedContractError,
  InvalidAddressError,
  ContractNotFoundError
} from "./errors";
//sorry for untyped imports!
const { default: ENS, getEnsAddress } = require("@ensdomains/ensjs");
const Web3Utils = require("web3-utils");

const nonIntegerMessage = "Input value was not an integer";

interface ENSCache {
  [name: string]: string;
}

export class ProjectEncoder {
  private provider: Provider | null;
  private ens: any | null; //any should be ENS, sorry >_>
  private registryAddress: string | undefined = undefined;
  private ensCache: ENSCache = {};
  private allocations: Codec.Evm.AllocationInfo;
  private userDefinedTypes: Codec.Format.Types.TypesById;

  /**
   * @protected
   */
  public getAllocations(): Codec.Evm.AllocationInfo {
    return this.allocations;
  }

  constructor(info: Types.EncoderInfoInternal) {
    //first, set up the basic info that we need to run
    if (info.userDefinedTypes && info.allocations) {
      this.userDefinedTypes = info.userDefinedTypes;
      this.allocations = info.allocations;
    } else {
      if (!info.compilations) {
        throw new NoInternalInfoError();
      }
      let definitions: { [compilationId: string]: Codec.Ast.AstNodes };
      ({
        definitions,
        types: this.userDefinedTypes
      } = Codec.Compilations.Utils.collectUserDefinedTypes(info.compilations));
      const {
        allocationInfo
      } = Codec.AbiData.Allocate.Utils.collectAllocationInfo(info.compilations);

      this.allocations = {};
      //only doing the relevant allocations: abi & calldata
      this.allocations.abi = Codec.AbiData.Allocate.getAbiAllocations(
        this.userDefinedTypes
      );
      this.allocations.calldata = Codec.AbiData.Allocate.getCalldataAllocations(
        allocationInfo,
        definitions,
        this.userDefinedTypes,
        this.allocations.abi
      );
      this.provider = info.provider || null;
      if (info.registryAddress !== undefined) {
        this.registryAddress = info.registryAddress;
      }
    }
  }

  /**
   * @protected
   */
  public async init(): Promise<void> {
    if (this.provider) {
      if (this.registryAddress !== undefined) {
        this.ens = new ENS({
          provider: this.provider,
          ensAddress: this.registryAddress
        });
      } else {
        //if we weren't given a registry address, we use the default one,
        //but what is that?  We have to look it up.
        //NOTE: ENS is supposed to do this for us in the constructor,
        //but due to a bug it doesn't.
        const networkId = await new Web3(this.provider).eth.net.getId();
        const registryAddress: string | undefined = getEnsAddress(networkId);
        if (registryAddress) {
          this.ens = new ENS({
            provider: this.provider,
            ensAddress: registryAddress
          });
        } else {
          //there is no default registry on this chain
          this.ens = null;
        }
      }
    } else {
      this.ens = null;
    }
  }

  public async wrapElementaryValue(
    dataType: Codec.Format.Types.ElementaryType,
    input: any
  ): Promise<Codec.Format.Values.ElementaryValue> {
    return <Codec.Format.Values.ElementaryValue>(
      await this.wrap(dataType, input)
    );
  }

  public async wrap(
    dataType: Codec.Format.Types.Type,
    input: any
  ): Promise<Codec.Format.Values.Value> {
    return await this.driveGenerator(
      Codec.Wrap.wrap(dataType, input, {
        userDefinedTypes: this.userDefinedTypes,
        loose: true
      })
    );
  }

  public async wrapForTransaction(
    method: Codec.Wrap.Method,
    inputs: any[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Wrap.Resolution> {
    debug("wrapForTransaction");
    return await this.driveGenerator(
      Codec.Wrap.wrapForMethod(method, inputs, {
        userDefinedTypes: this.userDefinedTypes,
        allowOptions: Boolean(options.allowOptions)
      })
    );
  }

  public async resolveAndWrap(
    methods: Codec.Wrap.Method[],
    inputs: any[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Wrap.Resolution> {
    return await this.driveGenerator(
      Codec.Wrap.resolveAndWrap(methods, inputs, {
        userDefinedTypes: this.userDefinedTypes,
        allowOptions: Boolean(options.allowOptions)
      })
    );
  }

  private async driveGenerator<T>(
    generator: Generator<Codec.WrapRequest, T, Codec.WrapResponse>
  ): Promise<T> {
    let response: Codec.WrapResponse | undefined = undefined;
    while (true) {
      debug("response: %O", response);
      const next = generator.next(response);
      switch (next.done) {
        case true:
          debug("returning: %O", next.value);
          return next.value;
        case false:
          const request = next.value;
          debug("request: %O", request);
          response = await this.respond(request);
      }
    }
  }

  private async respond(
    request: Codec.WrapRequest
  ): Promise<Codec.WrapResponse> {
    switch (request.kind) {
      case "integer":
        return this.recognizeInteger(request.input);
      case "decimal":
        return this.recognizeDecimal(request.input);
      case "address":
        return await this.recognizeAddress(request.name);
    }
  }

  public async encodeTransaction(
    method: Codec.Wrap.Method,
    inputs: any[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Options> {
    debug("encoding transaction");
    const resolution = await this.wrapForTransaction(method, inputs, options);
    const data = Codec.AbiData.Encode.encodeTupleAbiWithSelector(
      resolution.arguments,
      Codec.Conversion.toBytes(resolution.method.selector),
      this.allocations.abi
    );
    //note that the data option on resolution.options is ignored;
    //perhaps we can change this in Truffle 6, but for now we keep this
    //for compatibility
    return {
      ...resolution.options,
      data: Codec.Conversion.toHexString(data),
    };
  }

  public async resolveAndEncode(
    methods: Codec.Wrap.Method[],
    inputs: any[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Options> {
    debug("resolve & encode");
    const resolution = await this.resolveAndWrap(methods, inputs, options);
    const data = Codec.AbiData.Encode.encodeTupleAbiWithSelector(
      resolution.arguments,
      Codec.Conversion.toBytes(resolution.method.selector),
      this.allocations.abi
    );
    //note that the data option on resolution.options is ignored;
    //perhaps we can change this in Truffle 6, but for now we keep this
    //for compatibility
    return {
      ...resolution.options,
      data: Codec.Conversion.toHexString(data)
    };
  }

  private recognizeInteger(input: any): Codec.IntegerWrapResponse {
    if (Utils.isBigNumber(input)) {
      if (input.isInteger()) {
        return {
          kind: "integer" as const,
          value: BigInt(input.toFixed())
        };
      } else {
        return {
          kind: "integer" as const,
          value: null,
          reason: nonIntegerMessage
        };
      }
    } else if (Utils.isEthersBigNumber(input)) {
      const asHexString = input.toHexString();
      const asBigInt =
        asHexString[0] === "-"
          ? -BigInt(asHexString.slice(1))
          : BigInt(asHexString);
      return {
        kind: "integer" as const,
        value: asBigInt
      };
    } else if (EthersFixedNumber.isFixedNumber(input)) {
      //they had to make this one a pain...
      const asString = input.toString();
      //problem: the string might still have trailing ".0" on the end,
      //so let's run it through something that recognizes that (hack?)
      const asBig = new Big(asString);
      if (Codec.Conversion.countDecimalPlaces(asBig) === 0) {
        return {
          kind: "integer" as const,
          value: BigInt(asBig.toFixed())
        };
      } else {
        return {
          kind: "integer" as const,
          value: null,
          reason: nonIntegerMessage
        };
      }
    } else {
      return {
        kind: "integer" as const,
        value: null
      };
    }
  }

  private recognizeDecimal(input: any): Codec.DecimalWrapResponse {
    if (Utils.isBigNumber(input)) {
      if (input.isFinite()) {
        return {
          kind: "decimal" as const,
          value: new Big(input.toFixed())
        };
      } else {
        return {
          kind: "decimal" as const,
          value: null,
          reason: "Input was not a finite value"
        };
      }
    } else if (Utils.isEthersBigNumber(input)) {
      //as before, this has to come after
      return {
        kind: "decimal" as const,
        value: new Big(input.toString())
      };
    } else if (EthersFixedNumber.isFixedNumber(input)) {
      return {
        kind: "decimal" as const,
        value: new Big(input.toString())
      };
    } else {
      return {
        kind: "decimal" as const,
        value: null
      };
    }
  }

  private async recognizeAddress(
    input: string
  ): Promise<Codec.AddressWrapResponse> {
    let address: string | null = null;
    try {
      address = getAddress(input); //maybe it's an ICAP address?
      return {
        kind: "address",
        address
      };
    } catch (error) {
      if (!error) {
        throw error; //rethrow unepxected errors
      }
      switch (error.reason) {
        case "bad address checksum":
          throw error; //this shouldn't happen!
        //we already checked for this ourselves!
        case "bad icap checksum":
          return {
            kind: "address",
            address: null,
            reason: "ICAP address had bad checksum"
          };
        case "invalid address":
          //in this case, try resolving it as an ENS name
          const address = await this.resolveENSName(input);
          if (address !== null) {
            return {
              kind: "address",
              address
            };
          } else {
            return {
              kind: "address",
              address: null,
              reason: "Input was not recognizable as an address or ENS name"
            };
          }
        default:
          throw error; //rethrow unexpected errors
      }
    }
  }

  private async resolveENSName(input: string): Promise<string | null> {
    if (this.ens === null) {
      return null;
    }
    if (input in this.ensCache) {
      return this.ensCache[input];
    }
    let address: string;
    try {
      address = await this.ens.name(input).getAddress();
    } catch {
      //Normally I'd rethrow unexpected errors, but given the context here
      //that seems like it might be a problem
      address = null;
    }
    if (address === Codec.Evm.Utils.ZERO_ADDRESS) {
      //ENS returns zero address to indicate "not found"
      address = null;
    }
    this.ensCache[input] = address;
    return address;
  }

  public async forContract(
    contract: Types.ContractConstructorObject
  ): Promise<ContractEncoder> {
    return new ContractEncoder(this, contract);
  }

  public async forInstance(
    contract: Types.ContractConstructorObject,
    address?: string
  ): Promise<ContractInstanceEncoder> {
    const contractEncoder = await this.forContract(contract);
    if (address === undefined) {
      address = (await contract.deployed()).address;
    }
    return new ContractInstanceEncoder(contractEncoder, address);
  }
}

export class ContractEncoder {
  private projectEncoder: ProjectEncoder;
  private contract: Types.ContractConstructorObject;
  private constructorBinary: string;
  private constructorContextHash: string | undefined;
  private deployedContextHash: string | undefined;

  constructor(
    projectEncoder: ProjectEncoder,
    contract: Types.ContractConstructorObject
  ) {
    this.projectEncoder = projectEncoder;
    this.contract = contract;
    if (contract.binary.match(/0x([0-9a-fA-F]{2})*/)) {
      this.constructorBinary = contract.binary; //has link references resolved
    } else {
      throw new UnlinkedContractError(
        contract.contractName,
        contract.bytecode,
        contract.deployedBytecode
      );
    }
    if (contract.bytecode && contract.bytecode !== "0x") {
      this.constructorContextHash = Codec.Conversion.toHexString(
        Codec.Evm.Utils.keccak256({
          type: "string",
          value: contract.bytecode //has link references unresolved
        })
      );
    }
    if (contract.deployedBytecode && contract.deployedBytecode !== "0x") {
    this.deployedContextHash = Codec.Conversion.toHexString(
        Codec.Evm.Utils.keccak256({
          type: "string",
          value: contract.deployedBytecode //has link references unresolved
        })
      );
    }
    //finally: check that we have any necessary allocations for this contract!
    const allocations = this.projectEncoder.getAllocations();
    if ((
      this.constructorContextHash &&
      !allocations.calldata.constructorAllocations[this.constructorContextHash]
      ) || (
      this.deployedContextHash &&
      !allocations.calldata.functionAllocations[this.deployedContextHash]
    )) {
      throw new ContractNotFoundError(
        contract.contractName,
        contract.bytecode,
        contract.deployedBytecode
      );
    }
  }

  public async wrapElementaryValue(
    dataType: Codec.Format.Types.ElementaryType,
    input: any
  ): Promise<Codec.Format.Values.ElementaryValue> {
    return await this.projectEncoder.wrapElementaryValue(dataType, input);
  }

  public async wrap(
    dataType: Codec.Format.Types.Type,
    input: any
  ): Promise<Codec.Format.Values.Value> {
    return await this.projectEncoder.wrap(dataType, input);
  }

  public async wrapForTransaction(
    abi: Abi.FunctionEntry | Abi.ConstructorEntry,
    inputs: any[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Wrap.Resolution> {
    const method = this.getMethod(abi);
    return await this.projectEncoder.wrapForTransaction(
      method,
      inputs,
      options
    );
  }

  public async resolveAndWrap(
    abis: Abi.FunctionEntry[],
    inputs: any[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Wrap.Resolution> {
    const methods = abis.map(abi => this.getMethod(abi));
    //note we can't just write abis.map(this.getMethod)
    //because this would be undefined inside of it... I could
    //write abis.map(this.getMethod.bind(this)), but I find the
    //arrow way to be more readable
    return await this.projectEncoder.resolveAndWrap(
      methods,
      inputs,
      options
    );
  }

  public async encodeTransaction(
    abi: Abi.FunctionEntry | Abi.ConstructorEntry,
    inputs: any[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Options> {
    const method = this.getMethod(abi);
    return await this.projectEncoder.encodeTransaction(
      method,
      inputs,
      options
    );
  }

  public async resolveAndEncode(
    abis: Abi.FunctionEntry[],
    inputs: any[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Options> {
    const methods = abis.map(abi => this.getMethod(abi));
    //note we can't just write abis.map(this.getMethod)
    //because this would be undefined inside of it... I could
    //write abis.map(this.getMethod.bind(this)), but I find the
    //arrow way to be more readable
    return await this.projectEncoder.resolveAndEncode(
      methods,
      inputs,
      options
    );
  }

  public async forInstance(address?: string): Promise<ContractInstanceEncoder> {
    if (address === undefined) {
      address = (await this.contract.deployed()).address;
    }
    return new ContractInstanceEncoder(this, address);
  }

  private getMethod(
    abi: Abi.FunctionEntry | Abi.ConstructorEntry
  ): Codec.Wrap.Method {
    const allocations = this.projectEncoder.getAllocations();
    debug("got allocations");
    switch (abi.type) {
      case "constructor": {
        const allocation =
          allocations.calldata.constructorAllocations[
            this.constructorContextHash
          ].input;
        const inputs = allocation.arguments.map(
          input => ({ type: input.type, name: input.name || undefined }) //convert "" to undefined
        );
        return {
          selector: this.constructorBinary,
          inputs,
          abi
        };
      }
      case "function": {
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        const allocation =
          allocations.calldata.functionAllocations[this.deployedContextHash][
            selector
          ].input;
        const inputs = allocation.arguments.map(
          input => ({ type: input.type, name: input.name || undefined }) //convert "" to undefined
        );
        return {
          name: abi.name,
          selector,
          inputs,
          abi
        };
      }
    }
  }
}

export class ContractInstanceEncoder {
  private contractEncoder: ContractEncoder;
  private toAddress: string;

  constructor(contractEncoder: ContractEncoder, toAddress: string) {
    this.contractEncoder = contractEncoder;
    if (!Web3Utils.isAddress(toAddress)) {
      throw new InvalidAddressError(toAddress);
    }
    this.toAddress = Web3Utils.toChecksumAddress(toAddress);
  }

  public async wrapElementaryValue(
    dataType: Codec.Format.Types.ElementaryType,
    input: any
  ): Promise<Codec.Format.Values.ElementaryValue> {
    return await this.contractEncoder.wrapElementaryValue(dataType, input);
  }

  public async wrap(
    dataType: Codec.Format.Types.Type,
    input: any
  ): Promise<Codec.Format.Values.Value> {
    return await this.contractEncoder.wrap(dataType, input);
  }

  public async wrapForTransaction(
    abi: Abi.FunctionEntry | Abi.ConstructorEntry,
    inputs: any[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Wrap.Resolution> {
    const resolution = await this.contractEncoder.wrapForTransaction(
      abi,
      inputs,
      options
    );
    if (!resolution.options.to && abi.type === "function") {
      resolution.options.to = this.toAddress;
    }
    return resolution;
  }

  public async resolveAndWrap(
    abis: Abi.FunctionEntry[],
    inputs: any[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Wrap.Resolution> {
    const resolution = await this.contractEncoder.resolveAndWrap(
      abis,
      inputs,
      options
    );
    resolution.options.to = this.toAddress;
    return resolution;
  }

  public async encodeTransaction(
    abi: Abi.FunctionEntry | Abi.ConstructorEntry,
    inputs: any[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Options> {
    const encoded = await this.contractEncoder.encodeTransaction(
      abi,
      inputs,
      options
    );
    //note that the to options is simply overridden
    //perhaps we can change this in the future, but for now we keep this
    //for compatibility
    if (abi.type === "function") {
      encoded.to = this.toAddress;
    } else if (abi.type === "constructor") {
      encoded.to = undefined;
    }
    return encoded;
  }

  public async resolveAndEncode(
    abis: Abi.FunctionEntry[],
    inputs: any[],
    options: Types.ResolveOptions = {}
  ): Promise<Codec.Options> {
    const encoded = await this.contractEncoder.resolveAndEncode(
      abis,
      inputs,
      options
    );
    //note that the to options is simply overridden
    //perhaps we can change this in the future, but for now we keep this
    //for compatibility
    encoded.to = this.toAddress;
    return encoded;
  }
}
