import "source-map-support/register";

import { version as pkgVersion } from "@truffle/contract-schema/package.json";
import Ajv from "ajv";
import util from "util";

import contractObjectSchema from "@truffle/contract-schema/spec/contract-object.spec.json";
import networkObjectSchema from "@truffle/contract-schema/spec/network-object.spec.json";
import abiSchema from "@truffle/contract-schema/spec/abi.spec.json";

/**
 * Property definitions for Contract Objects
 *
 * Describes canonical output properties as sourced from some "dirty" input
 * object. Describes normalization process to account for deprecated and/or
 * nonstandard keys and values.
 *
 * Maps (key -> property) where:
 *  - `key` is the top-level output key matching up with those in the schema
 *  - `property` is an object with optional values:
 *      - `sources`: list of sources (see below); default `key`
 *      - `transform`: function(value) -> transformed value; default x -> x
 *
 * Each source represents a means to select a value from dirty object.
 * Allows:
 *  - dot-separated (`.`) string, corresponding to path to value in dirty
 *    object
 *  - function(dirtyObj) -> (cleanValue | undefined)
 *
 * The optional `transform` parameter standardizes value regardless of source,
 * for purposes of ensuring data type and/or string schemas.
 */

type HasSignature = {
  signature: any;
};

// helper that ensures abi's do not contain function signatures
const removeSignatures = <T extends HasSignature>(dirtyValueArray: T[]) =>
  dirtyValueArray.map(removeSignature);

const removePropertySignatures = <T extends HasSignature>(dirtyObject: {
  [key: string]: T;
}) =>
  Object.entries(dirtyObject)
    .map(([key, value]) => ({ [key]: removeSignature(value) }))
    .reduce((a, b) => ({ ...a, ...b }), {});

const removeSignature = <T extends HasSignature>(
  item: T
): Omit<T, "signature"> => {
  const { signature: _signature, ...rest } = item;
  return rest;
};

interface Property {
  sources?: string[];
  transform?: (value: any, obj: any) => any;
}

const properties: { [name: string]: Property } = {
  contractName: {
    sources: ["contractName", "contract_name"]
  },
  abi: {
    sources: ["abi", "interface"],
    transform: function(value: any) {
      if (typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = undefined;
        }
      }
      if (Array.isArray(value)) {
        return removeSignatures(value);
      }
      return value;
    }
  },
  metadata: {
    sources: ["metadata"]
  },
  bytecode: {
    sources: ["bytecode", "binary", "unlinked_binary", "evm.bytecode.object"],
    transform: (value: string) => {
      if (value && value.indexOf("0x") !== 0) {
        value = "0x" + value;
      }
      return value;
    }
  },
  deployedBytecode: {
    sources: [
      "deployedBytecode",
      "runtimeBytecode",
      "evm.deployedBytecode.object"
    ],
    transform: function(value: string) {
      if (value && value.indexOf("0x") !== 0) {
        value = "0x" + value;
      }
      return value;
    }
  },
  immutableReferences: {},
  generatedSources: {},
  deployedGeneratedSources: {},
  sourceMap: {
    sources: ["sourceMap", "srcmap", "evm.bytecode.sourceMap"]
  },
  deployedSourceMap: {
    sources: [
      "deployedSourceMap",
      "srcmapRuntime",
      "evm.deployedBytecode.sourceMap"
    ]
  },
  source: {},
  sourcePath: {},
  ast: {},
  legacyAST: {
    transform: function(value: object, obj: any) {
      var schemaVersion = obj.schemaVersion || "0.0.0";

      // legacyAST introduced in v2.0.0
      if (schemaVersion[0] < 2) {
        return obj.ast;
      } else {
        return value;
      }
    }
  },
  compiler: {},
  networks: {
    /**
     * Normalize a networks object. Currently this makes sure `events` are
     * always sanitized and `links` is extracted when copying from
     * a TruffleContract context object.
     *
     * @param {object} value - the target object
     * @param {object | TruffleContract} obj - the context, or source object.
     * @return {object} The normalized Network object
     */
    transform: function(value: any = {}, obj: any) {
      // Sanitize value's events for known networks
      for (const networkId of Object.keys(value)) {
        if (value[networkId].events) {
          value[networkId].events = removePropertySignatures(
            value[networkId].events
          );
        }
      }

      // Set and sanitize the current networks property from the
      // TruffleContract. Note: obj is a TruffleContract if it has
      // `network_id` attribute
      const networkId = obj.network_id;
      if (networkId && value.hasOwnProperty(networkId)) {
        value[networkId].links = obj.links;
        value[networkId].events = removePropertySignatures(obj.events);
      }

      return value;
    }
  },
  schemaVersion: {
    sources: ["schemaVersion", "schema_version"]
  },
  updatedAt: {
    sources: ["updatedAt", "updated_at"],
    transform: function(value: number | string) {
      if (typeof value === "number") {
        value = new Date(value).toISOString();
      }
      return value;
    }
  },
  networkType: {},
  devdoc: {},
  userdoc: {}
};

/**
 * Construct a getter for a given key, possibly applying some post-retrieve
 * transformation on the resulting value.
 *
 * @return {Function} Accepting dirty object and returning value || undefined
 */
const getter = <T, U>(
  key: string,
  transform: (value: T, obj?: any) => U = (x: T) => (x as unknown) as U
) => (obj: any) => {
  try {
    return transform(obj[key]);
  } catch (e) {
    return undefined;
  }
};

/**
 * Chains together a series of function(obj) -> value, passing resulting
 * returned value to next function in chain.
 *
 * Accepts any number of functions passed as arguments
 * @return {Function} Accepting initial object, returning end-of-chain value
 *
 * Assumes all intermediary values to be objects, with well-formed sequence
 * of operations.
 */
const chain = (...getters: any[]) => (obj: any) =>
  getters.reduce((cur: any, get: any) => get(cur), obj);

// Schema module
//

// Return a promise to validate a contract object
// - Resolves as validated `contractObj`
// - Rejects with list of errors from schema validator
export const validate = (contractObj: any) => {
  var ajv = new Ajv({ verbose: true });
  ajv.addSchema(abiSchema);
  ajv.addSchema(networkObjectSchema);
  ajv.addSchema(contractObjectSchema);
  if (ajv.validate("contract-object.spec.json", contractObj)) {
    return contractObj;
  } else {
    const message = `Schema validation failed. Errors:\n\n${ajv.errors
      .map(
        ({
          keyword,
          dataPath,
          schemaPath,
          params,
          message,
          data,
          parentSchema
        }: any) =>
          util.format(
            "%s (%s):\n%s\n",
            message,
            keyword,
            util.inspect(
              {
                dataPath,
                schemaPath,
                params,
                data,
                parentSchema
              },
              { depth: 5 }
            )
          )
      )
      .join("\n")}`;
    const error: any = new Error(message);
    error.errors = ajv.errors;
    throw error;
  }
};

// accepts as argument anything that can be turned into a contract object
// returns a contract object
export const normalize = (objDirty: any, options: any) => {
  options = options || {};
  const normalized: any = {};

  // iterate over each property
  for (const [key, property] of Object.entries(properties)) {
    let value; // normalized value || undefined

    // either used the defined sources or assume the key will only ever be
    // listed as its canonical name (itself)
    var sources = property.sources || [key];

    // iterate over sources until value is defined or end of list met
    for (let source of sources) {
      // string refers to path to value in objDirty, split and chain
      // getters
      const traversals = source.split(".").map(k => getter(k));
      value = chain.apply(null, traversals)(objDirty);
      if (value !== undefined) {
        break;
      }
    }

    // run source-agnostic transform on value
    // (e.g. make sure bytecode begins 0x)
    if (property.transform) {
      value = property.transform(value, objDirty);
    }

    // add resulting (possibly undefined) to normalized obj
    normalized[key] = value;
  }

  // Copy x- options
  Object.keys(objDirty).forEach(function(key) {
    if (key.indexOf("x-") === 0) {
      normalized[key] = getter(key)(objDirty);
    }
  });

  // update schema version
  normalized.schemaVersion = pkgVersion;

  if (options.validate) {
    validate(normalized);
  }

  return normalized;
};
