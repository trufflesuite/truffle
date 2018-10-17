var sha3 = require("crypto-js/sha3");
var pkgVersion = require("./package.json").version;
var Ajv = require("ajv");
var util = require("util");

var contractObjectSchema = require("./spec/contract-object.spec.json");
var networkObjectSchema = require("./spec/network-object.spec.json");
var abiSchema = require("./spec/abi.spec.json");


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
var properties = {
  "contractName": {
    "sources": ["contractName", "contract_name"]
  },
  "abi": {
    "sources": ["abi", "interface"],
    "transform": function(value) {
      if (typeof value === "string") {
        try {
          value = JSON.parse(value)
        } catch (e) {
          value = undefined;
        }
      }
      return value;
    }
  },
  "bytecode": {
    "sources": [
      "bytecode", "binary", "unlinked_binary", "evm.bytecode.object"
    ],
    "transform": function(value) {
      if (value && value.indexOf("0x") != 0) {
        value = "0x" + value;
      }
      return value;
    }
  },
  "deployedBytecode": {
    "sources": [
      "deployedBytecode", "runtimeBytecode", "evm.deployedBytecode.object"
    ],
    "transform": function(value) {
      if (value && value.indexOf("0x") != 0) {
        value = "0x" + value;
      }
      return value;
    }
  },
  "sourceMap": {
    "sources": ["sourceMap", "srcmap", "evm.bytecode.sourceMap"]
  },
  "deployedSourceMap": {
    "sources": ["deployedSourceMap", "srcmapRuntime", "evm.deployedBytecode.sourceMap"]
  },
  "source": {},
  "sourcePath": {},
  "ast": {},
  "legacyAST": {
    "transform": function(value, obj) {
      var schemaVersion = obj.schemaVersion || "0.0.0";

      // legacyAST introduced in v2.0.0
      if (schemaVersion[0] < 2) {
        return obj.ast;
      } else {
        return value
      }
    }
  },
  "compiler": {},
  "networks": {
    "transform": function(value) {
      if (value === undefined) {
        value = {}
      }
      return value;
    }
  },
  "schemaVersion": {
    "sources": ["schemaVersion", "schema_version"]
  },
  "updatedAt": {
    "sources": ["updatedAt", "updated_at"],
    "transform": function(value) {
      if (typeof value === "number") {
        value = new Date(value).toISOString();
      }
      return value;
    }
  },
  "devdoc": {},
  "userdoc": {},
};


/**
 * Construct a getter for a given key, possibly applying some post-retrieve
 * transformation on the resulting value.
 *
 * @return {Function} Accepting dirty object and returning value || undefined
 */
function getter(key, transform) {
  if (transform === undefined) {
    transform = function(x) { return x };
  }

  return function(obj) {
    try {
      return transform(obj[key]);
    } catch (e) {
      return undefined;
    }
  }
}


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
function chain() {
  var getters = Array.prototype.slice.call(arguments);
  return function(obj) {
    return getters.reduce(function (cur, get) {
      return get(cur);
    }, obj);
  }
}


// Schema module
//

var TruffleContractSchema = {
  // Return a promise to validate a contract object
  // - Resolves as validated `contractObj`
  // - Rejects with list of errors from schema validator
  validate: function(contractObj) {
    var ajv = new Ajv({ verbose: true });
    ajv.addSchema(abiSchema);
    ajv.addSchema(networkObjectSchema);
    ajv.addSchema(contractObjectSchema);
    if (ajv.validate("contract-object.spec.json", contractObj)) {
      return contractObj;
    } else {
      const message = `Schema validation failed. Errors:\n\n${
        ajv.errors
          .map( ({
            keyword,
            dataPath,
            schemaPath,
            params,
            message,
            data,
            schema,
            parentSchema
          }) => util.format(
            "%s (%s):\n%s\n",
            message, keyword, util.inspect({
              dataPath,
              schemaPath,
              params,
              data,
              parentSchema
            }, { depth: 5 })
          ))
          .join("\n")
      }`;
      const error = new Error(message);
      error.errors = ajv.errors;
      throw error;
    }
  },

  // accepts as argument anything that can be turned into a contract object
  // returns a contract object
  normalize: function(objDirty, options) {
    options = options || {};
    var normalized = {};

    // iterate over each property
    Object.keys(properties).forEach(function(key) {
      var property = properties[key];
      var value;  // normalized value || undefined

      // either used the defined sources or assume the key will only ever be
      // listed as its canonical name (itself)
      var sources = property.sources || [key];

      // iterate over sources until value is defined or end of list met
      for (var i = 0; value === undefined && i < sources.length; i++) {
        var source = sources[i];
        // string refers to path to value in objDirty, split and chain
        // getters
        if (typeof source === "string") {
          var traversals = source.split(".")
            .map(function(k) { return getter(k) });
          source = chain.apply(null, traversals);
        }

        // source should be a function that takes the objDirty and returns
        // value or undefined
        value = source(objDirty);
      }

      // run source-agnostic transform on value
      // (e.g. make sure bytecode begins 0x)
      if (property.transform) {
        value = property.transform(value, objDirty);
      }

      // add resulting (possibly undefined) to normalized obj
      normalized[key] = value;
    });

    // Copy x- options
    Object.keys(objDirty).forEach(function(key) {
      if (key.indexOf("x-") === 0) {
        normalized[key] = getter(key)(objDirty);
      }
    });

    // update schema version
    normalized.schemaVersion = pkgVersion;

    if (options.validate) {
      this.validate(normalized);
    }

    return normalized
  }
};

module.exports = TruffleContractSchema;
