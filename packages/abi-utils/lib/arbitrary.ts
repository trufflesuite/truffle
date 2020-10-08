import * as fc from "fast-check";
import faker from "faker";
import { camelCase, pascalCase } from "change-case";

import * as Types from "./types";

export const Parameter = () =>
  fc
    .tuple(
      fc.record({
        name: ParameterName()
      }),
      TypeRecord()
    )
    .map(records => records.reduce((a, b) => ({ ...a, ...b }), {}));

export const EventParameter = () =>
  fc
    .tuple(
      fc.record({
        name: ParameterName(),
        indexed: fc.boolean()
      }),
      TypeRecord()
    )
    .map(records => records.reduce((a, b) => ({ ...a, ...b }), {}));

export const EventEntry = () =>
  fc.record({
    type: fc.constant("event"),
    name: EventName(),
    inputs: fc.array(EventParameter(), { maxLength: 10 }).filter(inputs => {
      if (inputs.filter(({ indexed }) => indexed).length > 3) {
        // only up to 3 params can be indexed
        return false;
      }

      // names that are not blank should be unique
      const names = inputs.map(({ name }) => name).filter(name => name !== "");
      return names.length === new Set(names).size;
    }),
    anonymous: fc.boolean()
  });

export const FunctionEntry = () =>
  fc
    .tuple(
      fc.record(
        {
          type: fc.constant("function")
        },
        { withDeletedKeys: true }
      ),
      fc.record({
        name: FunctionName(),
        inputs: fc.array(Parameter(), { maxLength: 10 }).filter(inputs => {
          // names that are not blank should be unique
          const names = inputs
            .map(({ name }) => name)
            .filter(name => name !== "");
          return names.length === new Set(names).size;
        })
      }),
      fc.record(
        {
          outputs: fc.array(Parameter(), { maxLength: 10 }).filter(outputs => {
            // names that are not blank should be unique
            const names = outputs
              .map(({ name }) => name)
              .filter(name => name !== "");
            return names.length === new Set(names).size;
          })
        },
        { withDeletedKeys: true }
      ),
      fc
        .tuple(
          fc.oneof(
            fc.constant("pure"),
            fc.constant("view"),
            fc.constant("nonpayable"),
            fc.constant("payable")
          ),
          fc.boolean()
        )
        .map(([stateMutability, includeOptionals]) =>
          !includeOptionals
            ? { stateMutability }
            : {
                stateMutability,
                payable: stateMutability === "payable",
                constant:
                  stateMutability === "view" || stateMutability === "pure"
              }
        )
    )
    .map(records => records.reduce((a, b) => ({ ...a, ...b }), {}))
    .filter(entry => {
      const { inputs, outputs = [] } = entry as Types.FunctionEntry;
      // names that are not blank should be unique
      const names = [...inputs, ...outputs]
        .map(({ name }) => name)
        .filter(name => name !== "");
      return names.length === new Set(names).size;
    });

export const ReceiveEntry = () =>
  fc.record({
    type: fc.constant("receive"),
    stateMutability: fc.constant("payable")
  });

export const FallbackEntry = () =>
  fc
    .tuple(
      fc.record({
        type: fc.constant("fallback")
      }),
      fc
        .tuple(
          fc.oneof(fc.constant("nonpayable"), fc.constant("payable")),
          fc.boolean()
        )
        .map(([stateMutability, includeOptionals]) =>
          !includeOptionals
            ? { stateMutability }
            : {
                stateMutability,
                payable: stateMutability === "payable",
                constant:
                  stateMutability === "view" || stateMutability === "pure"
              }
        )
    )
    .map(records => records.reduce((a, b) => ({ ...a, ...b }), {}));

export const ConstructorEntry = () =>
  fc
    .tuple(
      fc.record({
        type: fc.constant("constructor"),
        inputs: fc.array(Parameter())
      }),
      fc
        .tuple(
          fc.oneof(fc.constant("nonpayable"), fc.constant("payable")),
          fc.boolean()
        )
        .map(([stateMutability, includeOptionals]) =>
          !includeOptionals
            ? { stateMutability }
            : {
                stateMutability,
                payable: stateMutability === "payable",
                constant:
                  stateMutability === "view" || stateMutability === "pure"
              }
        )
    )
    .map(records => records.reduce((a, b) => ({ ...a, ...b }), {}));

export const Abi = () =>
  fc
    .tuple(
      ConstructorEntry(),
      FallbackEntry(),
      ReceiveEntry(),
      fc.array(fc.oneof(FunctionEntry(), EventEntry()))
    )
    .chain(([constructor, fallback, receive, entries]) =>
      fc.shuffledSubarray([constructor, fallback, receive, ...entries])
    );

namespace Numerics {
  // 0 < n <= 32
  export const Bytes = () => fc.nat(31).map(k => 32 - k);

  // o < n <= 256
  export const Bits = () => Bytes().map(k => 8 * k);

  // 0 < n < 80
  export const DecimalPlaces = () => fc.nat(79).map(k => k + 1);

  export const Precision = () => fc.tuple(Bits(), DecimalPlaces());
}

namespace Primitives {
  export const Uint = () => Numerics.Bits().map(m => `uint${m}`);
  export const Int = () => Numerics.Bits().map(m => `int${m}`);
  export const Address = () => fc.constant("address");
  export const Bool = () => fc.constant("bool");
  export const Fixed = () =>
    Numerics.Precision().map(([m, n]) => `fixed${m}x${n}`);
  export const Ufixed = () =>
    Numerics.Precision().map(([m, n]) => `ufixed${m}x${n}`);
  export const BytesM = () => Numerics.Bytes().map(m => `bytes${m}`);
  export const Function = () => fc.constant("function");
  export const Bytes = () => fc.constant("bytes");
  export const String = () => fc.constant("string");
  export const Tuple = () => fc.constant("tuple");
}

const Primitive = () =>
  fc.oneof(
    Primitives.Uint(),
    Primitives.Int(),
    Primitives.Address(),
    Primitives.Bool(),
    Primitives.Fixed(),
    Primitives.Ufixed(),
    Primitives.BytesM(),
    // Primitives.Function(), // TODO re-add
    Primitives.Bytes(),
    Primitives.String(),
    Primitives.Tuple()
  );

const Type: fc.Memo<string> = fc.memo(n =>
  n === 0
    ? Primitive()
    : fc.oneof(Primitive(), ArrayFixed(n > 3 ? 3 : n), ArrayDynamic(n))
);

const ArrayFixed = fc.memo(n => {
  const tuple =
    n <= 1
      ? fc.tuple(Primitive(), fc.integer(1, 256))
      : fc.tuple(Type(), fc.integer(1, 256));

  return tuple.map(([type, length]) => `${type}[${length}]`);
});

const ArrayDynamic = fc.memo(n => {
  const item = n <= 1 ? Primitive() : Type();

  return item.map(type => `${type}[]`);
});

const reservedWords = new Set([
  "after",
  "alias",
  "apply",
  "auto",
  "case",
  "copyof",
  "default",
  "define",
  "final",
  "immutable",
  "implements",
  "in",
  "inline",
  "interface",
  "let",
  "macro",
  "match",
  "mutable",
  "null",
  "of",
  "partial",
  "promise",
  "reference",
  "relocatable",
  "sealed",
  "sizeof",
  "static",
  "supports",
  "switch",
  "typedef",
  "typeof",
  "unchecked"
]);

const fakerToArb = (template: string, transform = camelCase) => {
  return fc
    .integer()
    .noBias()
    .noShrink()
    .map(seed => {
      faker.seed(seed);
      return transform(faker.fake(template));
    })
    .filter(word => !reservedWords.has(word));
};

const ParameterName = () =>
  fc.frequency(
    { arbitrary: fakerToArb("{{hacker.noun}}"), weight: 9 },
    { arbitrary: fc.constant(""), weight: 1 }
  );
const EventName = () =>
  fakerToArb("{{hacker.verb}} {{hacker.noun}}", pascalCase);
const FunctionName = () => fakerToArb("{{hacker.verb}} {{hacker.noun}}");

const TypeRecord = (): fc.Arbitrary<any> =>
  Type().chain(type =>
    type.startsWith("tuple")
      ? fc.record({
          type: fc.constant(type),
          components: fc
            .array(
              Parameter().filter(({ name }) => name !== ""),
              { minLength: 1, maxLength: 5 }
            )
            .filter(items => {
              const names = items
                .map(({ name }) => name)
                .filter(name => name !== "");
              return names.length === new Set(names).size;
            })
        })
      : fc.record({
          type: fc.constant(type)
        })
  );
