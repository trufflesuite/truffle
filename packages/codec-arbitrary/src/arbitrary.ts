import * as fc from "fast-check";
import * as Codec from "@truffle/codec";

export const Location = (): fc.Arbitrary<Codec.Location> =>
  fc.oneof(
    fc.constant("memory" as const),
    fc.constant("storage" as const),
    fc.constant("calldata" as const)
  );

export const Mutability = (): fc.Arbitrary<Codec.Mutability> =>
  fc.oneof(
    fc.constant("pure" as const),
    fc.constant("view" as const),
    fc.constant("nonpayable" as const),
    fc.constant("payable" as const)
  );

export const ContractKind = (): fc.Arbitrary<Codec.ContractKind> =>
  fc.oneof(
    fc.constant("contract" as const),
    fc.constant("library" as const),
    fc.constant("interface" as const)
  );

export const id = (): fc.Arbitrary<string> => fc.string({ minLength: 1 });

export const identifier = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 1 });
