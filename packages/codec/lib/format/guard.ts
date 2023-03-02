export const typeGuardsForBaseTypes =
  <
    Value extends { kind: "value" },
    ErrorResult extends { kind: "error" },
    Result extends Value | ErrorResult
  >() =>
  <V extends Value, E extends ErrorResult, R extends Result>(
    ...guards: Array<(data: Value | ErrorResult | Result) => boolean>
  ) => {
    function isMatch(data: Value | ErrorResult | Result) {
      for (const guard of guards) {
        if (guard(data)) return true;
      }
      return false;
    }

    function valueTypeGuard(data: Value | Result): data is V {
      return data.kind === "value" && isMatch(data);
    }

    function errorResultTypeGuard(data: ErrorResult): data is E {
      return data.kind === "error" && isMatch(data);
    }

    function resultTypeGuard(data: Result): data is R {
      return isMatch(data);
    }

    return [
      valueTypeGuard,
      errorResultTypeGuard,
      resultTypeGuard,
      guards
    ] as const;
  };
