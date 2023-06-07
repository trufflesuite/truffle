import type { Format } from "@truffle/codec";

export function valueAndResultTypeGuardHelper<
  T extends Format.Values.Value,
  U extends Format.Errors.ErrorResult,
  V extends Format.Values.Result
>(
  ...guards: Array<
    (
      data:
        | Format.Values.Value
        | Format.Errors.ErrorResult
        | Format.Values.Result
    ) => boolean
  >
) {
  function isMatch(
    data: Format.Values.Value | Format.Errors.ErrorResult | Format.Values.Result
  ) {
    for (const guard of guards) {
      if (guard(data)) return true;
    }
    return false;
  }

  function valueTypeGuard(
    data: Format.Values.Value | Format.Values.Result
  ): data is T {
    return data.kind === "value" && isMatch(data);
  }

  function errorResultTypeGuard(data: Format.Errors.ErrorResult): data is U {
    return data.kind === "error" && isMatch(data);
  }

  function resultTypeGuard(data: Format.Values.Result): data is V {
    return isMatch(data);
  }

  return [
    valueTypeGuard,
    errorResultTypeGuard,
    resultTypeGuard,
    guards
  ] as const;
}
