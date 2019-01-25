const { default: convert } = require("@gnd/jsonschema2graphql");

import { makeExecutableSchema } from "graphql-tools";

import {
  printSchema, GraphQLObjectType, GraphQLNonNull, GraphQLList, GraphQLString
} from "graphql";

const abiSchema = require("truffle-contract-schema/spec/abi.spec.json");
const networkSchema = require("truffle-contract-schema/spec/network-object.spec.json");
const contractSchema = require("truffle-contract-schema/spec/contract-object.spec.json");

import { resolvers } from "./resolvers";

function searchReplace(predicate, func) {
  const search = (item) => {
    if (item instanceof Array) {
      return item.map(search);
    } else if (typeof item === "object") {
      return Object.assign(
        {}, ...Object.entries(item)
          .map(
            ([ key, value ]: any) => {
              return predicate(key, value)
                ? func(key, value)
                : { [key]: search(value) }
            }
          )
      );
    } else {
      return item;
    }
  }

  return search;
}

function convertToArray(schema, keyName = "key", valueName = "value") {
  const valueTypes = [
    ...Object.values(schema.patternProperties || {}),
    ...(schema.additionalProperties || [])
  ];

  if (!valueTypes.length) {
    return schema;
  }

  const valueType = (valueTypes.length > 1)
    ? { oneOf: valueTypes }
    : valueTypes[0];

  return {
    type: "array",
    items: {
      type: "object",
      properties: {
        [keyName]: { type: "string" },
        [valueName]: valueType
      }
    }
  }
}

function processSchema(name, schema) {
  const definitions = [
    ...Object.entries(schema.definitions)
      .map( ([ id, definition ]) => ({
        ...definition,

        "$id": id
      }))
  ];

  return [...definitions, { ...schema, "$id": name }];
}

const translations = [
  // fix cross-schema references
  ({ contractSchema, ...schemas }) => ({
    ...schemas,

    contractSchema: {
      ...contractSchema,

      properties: {
        ...contractSchema.properties,

        // instead of "abi.spec.json#"
        abi: {
          ...contractSchema.properties.abi,
          $ref: "ABI"
        },

        networks: {
          ...contractSchema.properties.networks,

          // instead of "network-object.spec.json#"
          // uses object mapping indirection to avoid hard-coding regex
          patternProperties: Object.assign(
            {}, ...
            Object.keys(contractSchema.properties.networks.patternProperties)
              .map( (pattern) => ({ [pattern]: { $ref: "NetworkObject" } }) )
          )
        }
      }
    }
  }),

  // simplify parameter type definition
  // definition in schema serves purely for validation, exclude as out of scope
  ({ abiSchema, ...schemas }) => ({
    ...schemas,

    abiSchema: {
      ...abiSchema,

      definitions: {
        ...abiSchema.definitions,

        Type: {
          type: "string"
        }
      }
    }
  }),

  // fix AbiItem polymorphism
  ({ abiSchema, ...schemas }) => ({
    ...schemas,

    abiSchema: {
      ...abiSchema,

      definitions: {
        ...abiSchema.definitions,

        // add definition - not in schema
        ItemType: {
          type: "string",
          enum: [
            "event",
            "function",
            "constructor",
            "fallback"
          ]
        },

        // ensure all items have same definition for `type` property
        // (including nullability, says GraphQL)
        ...Object.assign(
          {},
          // for each kind of abi item
          ...[
            "Event",
            "NormalFunction",
            "ConstructorFunction",
            "FallbackFunction"
          ]
            // lookup corresponding definition so we can use it by short name
            .map(
              (typeName) => ([ typeName, abiSchema.definitions[typeName] ])
            )
            // generate revised definition as key/value pair
            .map(
              ([ typeName, itemType ]) => ({
                [typeName]: {
                  ...itemType,

                  properties: {
                    ...itemType.properties,

                    // assign that new definition for all item types
                    type: {
                      $ref: "#/definitions/ItemType"
                    }
                  },

                  // ensure `type` is in array of required property names
                  required: Array.from(new Set([ ...itemType.required, "type" ]))
                }
              })
            )
        )
      }
    }
  }),

  // add rawABI field, move abi to abi.items
  ({ contractSchema, ...schemas }) => ({
    ...schemas,

    contractSchema: {
      ...contractSchema,

      properties: {
        ...contractSchema.properties,

        abi: {
          type: "object",
          properties: {
            json: {
              type: "string",
              description: "JSON-encoded ABI"
            },

            items: contractSchema.properties.abi
          },

          required: ["json", "items"]
        }
      }
    }
  }),

  // find all refs and remove leading `#/definitions/`
  searchReplace(
    (key) => key === "$ref",
    (key, value) => ({ [key]: value.replace(/^#\/definitions\/(.+)/, "$1") })
  ),

  // find all `^x-` patternProperties and remove
  searchReplace(
    (key) => key === "^x-",
    () => ({})
  ),

  // manually fix network object references to event
  searchReplace(
    (_, value) => value === "abi.spec.json#/definitions/Event",
    (key) => ({ [key]: "Event" })
  ),

  // convert networks to key/value array
  ({ contractSchema, ...schemas }) => ({
    ...schemas,

    contractSchema: {
      ...contractSchema,

      properties: {
        ...contractSchema.properties,
        networks: convertToArray(
          contractSchema.properties.networks,
          "networkId",
          "networkObject"
        )
      }
    }
  })

];


function processSchemas(schemas) {
  const {
    abiSchema,
    networkSchema,
    contractSchema
  } = translations.reduce(
    (schemas, translate: any) => translate(schemas),
    schemas
  )

  return [
    ...processSchema("ABI", abiSchema),
    ...processSchema("NetworkObject", networkSchema),
    ...processSchema("ContractObject", contractSchema)
  ]
}

const jsonSchema = processSchemas({
  abiSchema,
  networkSchema,
  contractSchema
});


const entryPoints = types => ({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      contract: {
        type: types["ContractObject"],
        args: {
          name: { type: new GraphQLNonNull(types["Name"]) },
          networkId: { type: GraphQLString }
        }
      },
      contractNames: {
        type: new GraphQLNonNull(new GraphQLList(types["Name"]))
      }
    }
  })
});


const graphqlSchema = convert({ jsonSchema, entryPoints });
const typeDefs = printSchema(graphqlSchema);

export const schema = makeExecutableSchema({ typeDefs, resolvers });

export const abiItem = schema.getType('AbiItem');
