import type { Format } from "@truffle/codec";

export function decoderErrorTypeGuardHelper<
  T extends Format.Errors.DecoderError
>(...kinds: Array<Format.Errors.DecoderError["kind"]>) {
  function typeGuard(data: Format.Errors.DecoderError): data is T {
    for (const kind of kinds) {
      if (data.kind === kind) return true;
    }
    return false;
  }

  return [typeGuard, kinds] as const;
}
