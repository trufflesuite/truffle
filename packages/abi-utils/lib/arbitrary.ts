import * as fc from "fast-check";
import { camelCase, pascalCase } from "change-case";
import wordLists from "./wordLists";
import type * as Types from "./types";

export const Parameter = () =>
  fc
    .tuple(
      fc.record({
        name: ParameterName()
      }),
      TypeRecord()
    )
    .map(([{ name }, type]) => ({ name, ...type }));

export const EventParameter = () =>
  fc
    .tuple(
      fc.record({
        name: ParameterName(),
        indexed: fc.boolean()
      }),
      TypeRecord()
    )
    .map(([{ name, indexed }, type]) => ({ name, indexed, ...type }));

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

export const ErrorEntry = () =>
  fc.record({
    type: fc.constant("error"),
    name: ErrorName(),
    inputs: fc.array(Parameter(), { maxLength: 10 }).filter(inputs => {
      // names that are not blank should be unique
      const names = inputs.map(({ name }) => name).filter(name => name !== "");
      return names.length === new Set(names).size;
    })
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
        inputs: fc.array(Parameter(), { maxLength: 10 })
      }),
      fc.record(
        {
          outputs: fc.array(Parameter(), { maxLength: 10 })
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
          fc.boolean(),
          fc.boolean()
        )
        .map(([stateMutability, includeLegacy, includeModern]) => {
          const payable = stateMutability === "payable";
          const constant =
            stateMutability === "view" || stateMutability === "pure";

          const modern = { stateMutability };
          const legacy = { payable, constant };

          return includeLegacy && includeModern
            ? { ...modern, ...legacy }
            : includeModern
            ? modern
            : legacy;
        })
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
          fc.boolean(),
          fc.boolean()
        )
        .map(([stateMutability, includeLegacy, includeModern]) => {
          const payable = stateMutability === "payable";

          const modern = { stateMutability };
          const legacy = { payable };

          return includeLegacy && includeModern
            ? { ...modern, ...legacy }
            : includeModern
            ? modern
            : legacy;
        })
    )
    .map(([{ type }, mutabilityFields]) => ({ type, ...mutabilityFields }));

export const ConstructorEntry = () =>
  fc
    .tuple(
      fc.record({
        type: fc.constant("constructor"),
        inputs: fc.array(Parameter(), { maxLength: 10 }).filter(inputs => {
          // names that are not blank should be unique
          const names = inputs
            .map(({ name }) => name)
            .filter(name => name !== "");
          return names.length === new Set(names).size;
        })
      }),
      fc
        .tuple(
          fc.oneof(fc.constant("nonpayable"), fc.constant("payable")),
          fc.boolean(),
          fc.boolean()
        )
        .map(([stateMutability, includeLegacy, includeModern]) => {
          const payable = stateMutability === "payable";

          const modern = { stateMutability };
          const legacy = { payable };

          return includeLegacy && includeModern
            ? { ...modern, ...legacy }
            : includeModern
            ? modern
            : legacy;
        })
    )
    .map(([{ type, inputs }, mutabilityFields]) => ({
      type,
      inputs,
      ...mutabilityFields
    }));

export const Abi = () =>
  fc
    .tuple(
      ConstructorEntry(),
      FallbackEntry(),
      ReceiveEntry(),
      fc.array(fc.oneof(FunctionEntry(), EventEntry(), ErrorEntry()))
    )
    .chain(([constructor, fallback, receive, entries]) =>
      fc.shuffledSubarray([constructor, fallback, receive, ...entries])
    );

namespace Numerics {
  // 0 < n <= 32
  // use subtraction so that fast-check treats 32 as simpler than 1
  export const Bytes = () => fc.nat(31).map(k => 32 - k);

  // 0 < n <= 256, 8 | n
  export const Bits = () => Bytes().map(k => 8 * k);

  // 0 < n <= 80
  // use fancy math so that fast-check treats 18 as the simplest case
  //
  //     0 ----------------- 79
  //     lines up as:
  //     18 ------ 80, 0 --- 17
  export const DecimalPlaces = () => fc.nat(79).map(k => ((k + 17) % 80) + 1);

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
    Primitives.Function(),
    Primitives.Bytes(),
    Primitives.String(),
    Primitives.Tuple()
  );

const Type: fc.Memo<string> = fc.memo(n =>
  n === 0
    ? Primitive()
    : // we cap this at 3 so that fast-check doesn't blow the stack
      fc.oneof(Primitive(), ArrayFixed(n > 3 ? 3 : n), ArrayDynamic(n))
);

const ArrayFixed = fc.memo(n =>
  fc
    .tuple(Type(n - 1), fc.integer({ min: 1, max: 256 }))
    .map(([type, length]) => `${type}[${length}]`)
);

const ArrayDynamic = fc.memo(n => Type(n - 1).map(type => `${type}[]`));

const reservedWords = new Set([
  "Error",
  "Panic",
  "_",
  "abi",
  "abstract",
  "addmod",
  "address",
  "after",
  "alias",
  "anonymous",
  "apply",
  "as",
  "assembly",
  "assert",
  "auto",
  "block",
  "blockhash",
  "bool",
  "break",
  "byte",
  "bytes",
  "calldata",
  "case",
  "catch",
  "constant",
  "constructor",
  "continue",
  "contract",
  "copyof",
  "days",
  "default",
  "define",
  "delete",
  "ecrecover",
  "else",
  "emit",
  "enum",
  "error",
  "ether",
  "event",
  "external",
  "fallback",
  "false",
  "final",
  "finney",
  "fixed",
  "for",
  "from",
  "function",
  "gasleft",
  "gwei",
  "hours",
  "if",
  "immutable",
  "implements",
  "import",
  "in",
  "indexed",
  "inline",
  "int", // we can ignore int256, etc., since faker won't ever generate those
  "interface",
  "internal",
  "is",
  "keccak256",
  "let",
  "library",
  "log0",
  "log1",
  "log2",
  "log3",
  "log4",
  "macro",
  "mapping",
  "match",
  "memory",
  "minutes",
  "modifier",
  "msg",
  "mulmod",
  "mutable",
  "new",
  "now",
  "null",
  "of",
  "override",
  "partial",
  "payable",
  "pragma",
  "private",
  "promise",
  "public",
  "pure",
  "receive",
  "reference",
  "relocatable",
  "require",
  "return",
  "returns",
  "revert",
  "ripemd160",
  "sealed",
  "seconds",
  "selfdestruct",
  "sha256",
  "sha3",
  "sizeof",
  "static",
  "storage",
  "string",
  "struct",
  "suicide",
  "super",
  "supports",
  "switch",
  "szabo",
  "this",
  "throw",
  "true",
  "try",
  "tx",
  "type",
  "typedef",
  "typeof",
  "ufixed",
  "uint",
  "unchecked",
  "using",
  "var",
  "view",
  "virtual",
  "weeks",
  "wei",
  "while",
  "years"
]);

type WordListKey = keyof typeof wordLists;
const getArb = (
  wordTypes: WordListKey[],
  transform = camelCase
): fc.Arbitrary<string> => {
  const results: fc.Arbitrary<string>[] = [];
  for (const wordType of wordTypes) {
    if (wordType === "noun") {
      results.push(
        fc
          .integer({ min: 0, max: wordLists["noun"].length - 1 })
          .noBias()
          .noShrink()
          .map(index => wordLists["noun"][index])
      );
    } else if (wordType === "verb") {
      results.push(
        fc
          .integer({ min: 0, max: wordLists["verb"].length - 1 })
          .noBias()
          .noShrink()
          .map(index => wordLists["verb"][index])
      );
    }
  }

  return fc
    .tuple(...results)
    .map((words: string[]): string => transform(words.join(" ")))
    .filter(word => !reservedWords.has(word));
};

const ParameterName = () =>
  fc.oneof(
    { arbitrary: getArb(["noun"]), weight: 9 },
    { arbitrary: fc.constant(""), weight: 1 }
  );
const EventName = () => getArb(["verb", "noun"], pascalCase);
const ErrorName = () => getArb(["noun", "noun"], pascalCase);
const FunctionName = () => getArb(["verb", "noun"]);

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
