import BN from "bn.js";
import * as fc from "fast-check";
import { Format } from "@truffle/codec";

import {
  Location,
  Mutability,
  ContractKind,
  id,
  identifier
} from "./arbitrary";

const bits = () => fc.integer({ min: 1, max: 32 }).map(n => n * 8);

const places = () => fc.integer({ min: 0, max: 80 });

const makeType = <T extends Format.Types.Type>(
  typeClass: T["typeClass"],
  options: (T extends { kind: string } ? { kind: T["kind"] } : {}) & {
    fields: {
      [K in keyof Omit<T, "typeClass" | "kind">]: fc.Arbitrary<T[K]>;
    };
    optionalKeys?: (keyof Omit<T, "typeClass" | "kind">)[];
  }
) => {
  const { fields, optionalKeys = [] } = options;
  const kind =
    "kind" in options
      ? // @ts-ignore to accommodate TS dumbness (ifs work, but not ternary ops?)
        options.kind
      : undefined;

  // @ts-ignore
  const baseRequiredKeys: (keyof T)[] =
    "kind" in options ? ["typeClass", "kind"] : ["typeClass"];
  const optional = new Set(optionalKeys);

  // @ts-ignore
  const requiredKeys: (keyof T)[] = [
    ...baseRequiredKeys,
    // @ts-ignore
    ...Object.keys(fields).filter(key => !optional.has(key))
  ];

  return (
    options: {
      [K in keyof Omit<T, "typeClass" | "kind">]?: T[K];
    } = {}
  ): fc.Arbitrary<T> =>
    fc.record(
      {
        typeClass: fc.constant(typeClass),
        ...Object.entries(fields)
          .map(([key, arbitrary]) => ({
            [key]: key in options ? fc.constant(options[key]) : arbitrary
          }))
          .reduce((a, b) => ({ ...a, ...b }), {}),
        ...(kind ? { kind: fc.constant(kind) } : {})
      },
      {
        // @ts-ignore
        requiredKeys
      }
    ) as fc.Arbitrary<T>;
};

export const UintType = makeType<Format.Types.UintType>("uint", {
  fields: {
    bits: bits()
  }
});

export const IntType = makeType<Format.Types.IntType>("int", {
  fields: {
    bits: bits()
  }
});

export const BoolType = makeType<Format.Types.BoolType>("bool", {
  fields: {}
});

export const BytesTypeStatic = makeType<Format.Types.BytesTypeStatic>("bytes", {
  kind: "static",
  fields: {
    length: fc.nat()
  }
});

export const BytesTypeDynamic = makeType<Format.Types.BytesTypeDynamic>(
  "bytes",
  {
    kind: "dynamic",
    fields: {
      location: Location()
    },
    optionalKeys: ["location"]
  }
);

export const BytesType = (): fc.Arbitrary<Format.Types.BytesType> =>
  fc.oneof(BytesTypeStatic(), BytesTypeDynamic());

export const AddressTypeSpecific = makeType<Format.Types.AddressTypeSpecific>(
  "address",
  {
    kind: "specific",
    fields: {
      payable: fc.boolean()
    }
  }
);

export const AddressTypeGeneral = makeType<Format.Types.AddressTypeGeneral>(
  "address",
  {
    kind: "general",
    fields: {}
  }
);

export const AddressType = (): fc.Arbitrary<Format.Types.AddressType> =>
  fc.oneof(AddressTypeSpecific(), AddressTypeGeneral());

export const FixedType = makeType<Format.Types.FixedType>("fixed", {
  fields: {
    bits: bits(),
    places: places()
  }
});

export const UfixedType = makeType<Format.Types.UfixedType>("ufixed", {
  fields: {
    bits: bits(),
    places: places()
  }
});

export const StringType = makeType<Format.Types.StringType>("string", {
  fields: {
    location: Location()
  },
  optionalKeys: ["location"]
});

export const ContractTypeNative = makeType<Format.Types.ContractTypeNative>(
  "contract",
  {
    kind: "native",
    fields: {
      contractKind: ContractKind(),
      id: id(),
      payable: fc.boolean(),
      typeName: identifier()
    },
    optionalKeys: ["contractKind", "payable"]
  }
);

export const ContractTypeForeign = makeType<Format.Types.ContractTypeForeign>(
  "contract",
  {
    kind: "foreign",
    fields: {
      contractKind: ContractKind(),
      payable: fc.boolean(),
      typeName: identifier()
    },
    optionalKeys: ["contractKind", "payable"]
  }
);

export const ContractType = (): fc.Arbitrary<Format.Types.ContractType> =>
  fc.oneof(ContractTypeNative(), ContractTypeForeign());

export const EnumTypeLocal = makeType<Format.Types.EnumTypeLocal>("enum", {
  kind: "local",
  fields: {
    definingContract: ContractTypeNative(),
    definingContractName: identifier(),
    id: id(),
    options: fc.array(identifier()),
    typeName: identifier()
  },
  optionalKeys: ["definingContract", "options"]
});

export const EnumTypeGlobal = makeType<Format.Types.EnumTypeGlobal>("enum", {
  kind: "global",
  fields: {
    id: id(),
    options: fc.array(identifier()),
    typeName: identifier()
  },
  optionalKeys: ["options"]
});

export const EnumType = (): fc.Arbitrary<Format.Types.EnumType> =>
  fc.oneof(EnumTypeLocal(), EnumTypeGlobal());

export const ElementaryType = (): fc.Arbitrary<Format.Types.ElementaryType> =>
  fc.oneof(
    UintType(),
    IntType(),
    BoolType(),
    FixedType(),
    UfixedType(),
    AddressType(),
    StringType(),
    EnumType(),
    ContractType()
  );

export const ArrayTypeStatic = makeType<Format.Types.ArrayTypeStatic>("array", {
  kind: "static",
  fields: {
    baseType: Type(),
    length: fc.nat().map(n => new BN(n)),
    location: Location()
  },
  optionalKeys: ["location"]
});

export const ArrayTypeDynamic = makeType<Format.Types.ArrayTypeDynamic>(
  "array",
  {
    kind: "dynamic",
    fields: {
      baseType: Type(),
      location: Location()
    },
    optionalKeys: ["location"]
  }
);

export const ArrayType = (
  options: {
    baseType?: Format.Types.Type;
  } = {}
): fc.Arbitrary<Format.Types.ArrayType> => {
  const { baseType } = options;

  return fc.oneof(
    ArrayTypeDynamic({ baseType }),
    ArrayTypeStatic({ baseType })
  );
};

export const MappingType = makeType<Format.Types.MappingType>("mapping", {
  fields: {
    keyType: ElementaryType(),
    location: fc.constant("storage"),
    valueType: Type()
  },
  optionalKeys: ["location"]
});

export const FunctionExternalTypeGeneral = makeType<
  Format.Types.FunctionExternalTypeGeneral
>("function", {
  kind: "general",
  fields: {
    visibility: fc.constant("external")
  }
});

export const FunctionExternalTypeSpecific = makeType<
  Format.Types.FunctionExternalTypeSpecific
>("function", {
  kind: "specific",
  fields: {
    inputParameterTypes: fc.array(Type()),
    outputParameterTypes: fc.array(Type()),
    mutability: Mutability(),
    visibility: fc.constant("external")
  }
});

export const FunctionExternalType = (): fc.Arbitrary<
  Format.Types.FunctionExternalType
> => fc.oneof(FunctionExternalTypeGeneral(), FunctionExternalTypeSpecific());

export const FunctionInternalType = makeType<Format.Types.FunctionInternalType>(
  "function",
  {
    fields: {
      inputParameterTypes: fc.array(Type()),
      outputParameterTypes: fc.array(Type()),
      mutability: Mutability(),
      visibility: fc.constant("internal")
    }
  }
);

export const FunctionType = (): fc.Arbitrary<Format.Types.FunctionType> =>
  fc.oneof(FunctionExternalType(), FunctionInternalType());

export const NameTypePair = (): fc.Arbitrary<Format.Types.NameTypePair> =>
  fc.record({
    name: identifier(),
    type: Type()
  });

export const StructTypeLocal = makeType<Format.Types.StructTypeLocal>(
  "struct",
  {
    kind: "local",
    fields: {
      definingContract: ContractTypeNative(),
      definingContractName: identifier(),
      id: id(),
      location: Location(),
      memberTypes: fc.array(NameTypePair()),
      typeName: identifier()
    },
    optionalKeys: ["definingContract", "location", "memberTypes"]
  }
);

export const StructTypeGlobal = makeType<Format.Types.StructTypeGlobal>(
  "struct",
  {
    kind: "global",
    fields: {
      id: id(),
      location: Location(),
      memberTypes: fc.array(NameTypePair()),
      typeName: identifier()
    },
    optionalKeys: ["location", "memberTypes"]
  }
);

export const StructType = (): fc.Arbitrary<Format.Types.StructType> =>
  fc.oneof(StructTypeLocal(), StructTypeGlobal());

export function Type(): fc.Arbitrary<Format.Types.Type> {
  return fc.oneof(
    UintType(),
    IntType(),
    BoolType(),
    BytesType(),
    AddressType(),
    FixedType(),
    UfixedType(),
    StringType(),
    EnumType(),
    ContractType(),
    ArrayType(),
    MappingType(),
    FunctionType(),
    StructType()
  );
}
