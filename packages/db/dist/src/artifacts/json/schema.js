"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.abiSchema = void 0;
const { default: convert } = require("@gnd/jsonschema2graphql");
const graphql_tools_1 = require("@gnd/graphql-tools");
const graphql_1 = require("graphql");
const rawSchemas = {
    abi: require("@truffle/contract-schema/spec/abi.spec.json"),
    networkObject: require("@truffle/contract-schema/spec/network-object.spec.json"),
    contractObject: require("@truffle/contract-schema/spec/contract-object.spec.json")
};
const resolvers_1 = require("./resolvers");
function searchReplace(predicate, func) {
    const search = item => {
        if (item instanceof Array) {
            return item.map(search);
        }
        else if (typeof item === "object") {
            return Object.assign({}, ...Object.entries(item).map(([key, value]) => {
                return predicate(key, value)
                    ? func(key, value)
                    : { [key]: search(value) };
            }));
        }
        else {
            return item;
        }
    };
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
    const valueType = valueTypes.length > 1 ? { oneOf: valueTypes } : valueTypes[0];
    return {
        type: "array",
        items: {
            type: "object",
            properties: {
                [keyName]: { type: "string" },
                [valueName]: valueType
            }
        }
    };
}
function processSchema(name, schema) {
    const definitions = [
        ...Object.entries(schema.definitions).map(([id, definition]) => (Object.assign(Object.assign({}, definition), { $id: id })))
    ];
    return [...definitions, Object.assign(Object.assign({}, schema), { $id: name })];
}
const translations = [
    // fix cross-schema references
    (_a) => {
        var { contractObject } = _a, schemas = __rest(_a, ["contractObject"]);
        return (Object.assign(Object.assign({}, schemas), { contractObject: Object.assign(Object.assign({}, contractObject), { properties: Object.assign(Object.assign({}, contractObject.properties), { networks: Object.assign(Object.assign({}, contractObject.properties.networks), { 
                        // instead of "network-object.spec.json#"
                        // uses object mapping indirection to avoid hard-coding regex
                        patternProperties: Object.assign({}, ...Object.keys(contractObject.properties.networks.patternProperties).map(pattern => ({ [pattern]: { $ref: "NetworkObject" } }))) }) }) }) }));
    },
    // simplify parameter type definition
    // definition in schema serves purely for validation, exclude as out of scope
    (_a) => {
        var { abi } = _a, schemas = __rest(_a, ["abi"]);
        return (Object.assign(Object.assign({}, schemas), { abi: Object.assign(Object.assign({}, abi), { definitions: Object.assign(Object.assign({}, abi.definitions), { Type: {
                        type: "string"
                    } }) }) }));
    },
    // fix AbiItem polymorphism
    (_a) => {
        var { abi } = _a, schemas = __rest(_a, ["abi"]);
        return (Object.assign(Object.assign({}, schemas), { abi: Object.assign(Object.assign({}, abi), { definitions: Object.assign(Object.assign(Object.assign({}, abi.definitions), { 
                    // add definition - not in schema
                    ItemType: {
                        type: "string",
                        enum: ["event", "function", "constructor", "fallback"]
                    } }), Object.assign({}, 
                // for each kind of abi item
                ...[
                    "Event",
                    "NormalFunction",
                    "ConstructorFunction",
                    "FallbackFunction"
                ]
                    // lookup corresponding definition so we can use it by short name
                    .map(typeName => [typeName, abi.definitions[typeName]])
                    // generate revised definition as key/value pair
                    .map(([typeName, itemType]) => ({
                    [typeName]: Object.assign(Object.assign({}, itemType), { properties: Object.assign(Object.assign({}, itemType.properties), { 
                            // assign that new definition for all item types
                            type: {
                                $ref: "#/definitions/ItemType"
                            } }), 
                        // ensure `type` is in array of required property names
                        required: Array.from(new Set([...itemType.required, "type"])) })
                })))) }) }));
    },
    // override abi field to show only json
    (_a) => {
        var { contractObject } = _a, schemas = __rest(_a, ["contractObject"]);
        return (Object.assign(Object.assign({}, schemas), { contractObject: Object.assign(Object.assign({}, contractObject), { properties: Object.assign(Object.assign({}, contractObject.properties), { abi: {
                        type: "object",
                        properties: {
                            json: {
                                type: "string",
                                description: "JSON-encoded ABI"
                            }
                        },
                        required: ["json"]
                    } }) }) }));
    },
    // override ast field to be object with json property
    (_a) => {
        var { contractObject } = _a, schemas = __rest(_a, ["contractObject"]);
        return (Object.assign(Object.assign({}, schemas), { contractObject: Object.assign(Object.assign({}, contractObject), { properties: Object.assign(Object.assign({}, contractObject.properties), { ast: {
                        type: "object",
                        properties: {
                            json: {
                                type: "string",
                                description: "JSON-encoded AST"
                            }
                        },
                        required: ["json"]
                    } }) }) }));
    },
    // override sourceMap field to be object with json property
    (_a) => {
        var { contractObject } = _a, schemas = __rest(_a, ["contractObject"]);
        return (Object.assign(Object.assign({}, schemas), { contractObject: Object.assign(Object.assign({}, contractObject), { properties: Object.assign(Object.assign({}, contractObject.properties), { sourceMap: {
                        type: "object",
                        properties: {
                            json: {
                                type: "string",
                                description: "JSON-encoded sourceMap"
                            }
                        },
                        required: ["json"]
                    } }) }) }));
    },
    // find all refs and remove leading `#/definitions/`
    searchReplace(key => key === "$ref", (key, value) => ({ [key]: value.replace(/^#\/definitions\/(.+)/, "$1") })),
    // find all `^x-` patternProperties and remove
    searchReplace(key => key === "^x-", () => ({})),
    // manually fix network object references to event
    searchReplace((_, value) => value === "abi.spec.json#/definitions/Event", key => ({ [key]: "Event" })),
    // convert networks to key/value array
    (_a) => {
        var { contractObject } = _a, schemas = __rest(_a, ["contractObject"]);
        return (Object.assign(Object.assign({}, schemas), { contractObject: Object.assign(Object.assign({}, contractObject), { properties: Object.assign(Object.assign({}, contractObject.properties), { networks: convertToArray(contractObject.properties.networks, "networkId", "networkObject") }) }) }));
    },
    (_a) => {
        var { contractObject } = _a, schemas = __rest(_a, ["contractObject"]);
        return (Object.assign(Object.assign({}, schemas), { contractObject: Object.assign(Object.assign({}, contractObject), { properties: Object.assign(Object.assign({}, contractObject.properties), { source: {
                        type: "object",
                        properties: {
                            contents: { type: "string" },
                            sourcePath: { type: "string" }
                        }
                    } }) }) }));
    },
    (_a) => {
        var { contractObject } = _a, schemas = __rest(_a, ["contractObject"]);
        return (Object.assign(Object.assign({}, schemas), { contractObject: Object.assign(Object.assign({}, contractObject), { properties: Object.assign(Object.assign({}, contractObject.properties), { bytecode: {
                        type: "object",
                        properties: {
                            bytes: { type: "string" },
                            linkReferences: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        offsets: {
                                            type: "array",
                                            items: {
                                                type: "integer"
                                            }
                                        },
                                        name: { type: "string" },
                                        length: { type: "integer" }
                                    }
                                }
                            }
                        }
                    } }) }) }));
    },
    (_a) => {
        var { contractObject } = _a, schemas = __rest(_a, ["contractObject"]);
        return (Object.assign(Object.assign({}, schemas), { contractObject: Object.assign(Object.assign({}, contractObject), { properties: Object.assign(Object.assign({}, contractObject.properties), { deployedBytecode: {
                        type: "object",
                        properties: {
                            bytes: { type: "string" },
                            linkReferences: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        offsets: {
                                            type: "array",
                                            items: {
                                                type: "integer"
                                            }
                                        },
                                        name: { type: "string" },
                                        length: { type: "integer" }
                                    }
                                }
                            }
                        }
                    } }) }) }));
    }
];
function processSchemas(schemas) {
    const { abi, networkObject, contractObject } = translations.reduce((schemas, translate) => translate(schemas), schemas);
    return {
        abi: processSchema("ABI", abi),
        networkObject: processSchema("NetworkObject", networkObject),
        contractObject: processSchema("ContractObject", contractObject)
    };
}
const jsonSchemas = processSchemas(rawSchemas);
exports.abiSchema = convert({ jsonSchema: jsonSchemas.abi });
const entryPoints = types => ({
    query: new graphql_1.GraphQLObjectType({
        name: "Query",
        fields: {
            contract: {
                type: types["ContractObject"],
                args: {
                    name: { type: new graphql_1.GraphQLNonNull(types["Name"]) },
                    networkId: { type: graphql_1.GraphQLString }
                }
            },
            contractNames: {
                type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(types["Name"]))
            }
        }
    })
});
exports.schema = graphql_tools_1.makeExecutableSchema({
    typeDefs: graphql_1.printSchema(convert({
        jsonSchema: [
            ...jsonSchemas.abi,
            ...jsonSchemas.networkObject,
            ...jsonSchemas.contractObject
        ],
        entryPoints
    })),
    resolvers: resolvers_1.resolvers
});
//# sourceMappingURL=schema.js.map