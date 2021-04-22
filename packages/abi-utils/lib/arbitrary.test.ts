import { testProp } from "jest-fast-check";
import * as abiSchema from "@truffle/contract-schema/spec/abi.spec.json";
import { matchers } from "jest-json-schema";

expect.extend(matchers);

import * as Arbitrary from "./arbitrary";

// helper function to ensure that, when we match against a given subschema,
// we also include all the definitions, in case the subschema references those
const withDefinitions = (schema: object) => ({
  definitions: abiSchema.definitions,
  ...schema
});

const arbitraries = {
  Parameter: {
    arbitrary: Arbitrary.Parameter(),
    schema: withDefinitions(abiSchema.definitions.Parameter)
  },
  EventParameter: {
    arbitrary: Arbitrary.EventParameter(),
    schema: withDefinitions(abiSchema.definitions.EventParameter)
  },
  EventEntry: {
    arbitrary: Arbitrary.EventEntry(),
    schema: withDefinitions(abiSchema.definitions.Event)
  },
  ErrorEntry: {
    arbitrary: Arbitrary.ErrorEntry(),
    schema: withDefinitions(abiSchema.definitions.Error)
  },
  FunctionEntry: {
    arbitrary: Arbitrary.FunctionEntry(),
    schema: withDefinitions(abiSchema.definitions.NormalFunction)
  },
  ConstructorEntry: {
    arbitrary: Arbitrary.ConstructorEntry(),
    schema: withDefinitions(abiSchema.definitions.ConstructorFunction)
  },
  ReceiveEntry: {
    arbitrary: Arbitrary.ReceiveEntry(),
    schema: withDefinitions(abiSchema.definitions.ReceiveFunction)
  },
  FallbackEntry: {
    arbitrary: Arbitrary.FallbackEntry(),
    schema: withDefinitions(abiSchema.definitions.FallbackFunction)
  },
  Abi: {
    arbitrary: Arbitrary.Abi(),
    schema: abiSchema
  }
};

for (const [name, { arbitrary, schema }] of Object.entries(arbitraries)) {
  describe(`Arbitrary.${name}`, () => {
    testProp("validates schema", [arbitrary], value => {
      expect(value).toMatchSchema(schema);
    });
  });
}
