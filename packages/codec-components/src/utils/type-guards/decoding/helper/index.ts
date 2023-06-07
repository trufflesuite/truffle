import type * as Codec from "@truffle/codec";

type Decoding =
  | Codec.CalldataDecoding
  | Codec.LogDecoding
  | Codec.ReturndataDecoding;

export function decodingTypeGuardHelper<T extends Decoding>(
  ...kinds: Array<Decoding["kind"]>
) {
  function typeGuard(data: Decoding): data is T {
    for (const kind of kinds) {
      if (data.kind === kind) return true;
    }
    return false;
  }

  return [typeGuard, kinds] as const;
}
