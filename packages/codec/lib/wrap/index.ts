import debugModule from "debug";
const debug = debugModule("codec:wrap");

import type * as Format from "@truffle/codec/format";
import type { Method, Resolution } from "./types";
import type { WrapOptions, ResolveOptions } from "./types";
import type { WrapRequest, WrapResponse } from "../types";
import { isMoreSpecificMultiple } from "./priority";
import {
  NoOverloadsMatchedError,
  NoUniqueBestOverloadError,
  TypeMismatchError,
  BadResponseTypeError
} from "./errors";
export * from "./errors";
import { wrap } from "./wrap";
import type * as Common from "@truffle/codec/common";

export {
  NoOverloadsMatchedError,
  NoUniqueBestOverloadError,
  TypeMismatchError,
  BadResponseTypeError
};
export { wrap };
export * from "./types";
export * as Messages from "./messages";

export function* wrapMultiple(
  types: Format.Types.OptionallyNamedType[],
  inputs: unknown[],
  wrapOptions: WrapOptions
): Generator<WrapRequest, Format.Values.Value[], WrapResponse> {
  //just wrap the types in a tuple and defer to wrap()
  const combinedType: Format.Types.TupleType = {
    typeClass: "tuple",
    memberTypes: types
  };
  debug("wrapping multiple");
  const wrappedTogether = <Format.Values.TupleValue>(
    yield* wrap(combinedType, inputs, wrapOptions)
  );
  return wrappedTogether.value.map(({ value }) => <Format.Values.Value>value);
}

//note: turns on loose
export function* wrapForMethod(
  method: Method,
  inputs: unknown[],
  resolveOptions: ResolveOptions
): Generator<WrapRequest, Resolution, WrapResponse> {
  const wrapped = yield* wrapForMethodRaw(method, inputs, resolveOptions, true);
  return wrappingToResolution(method, wrapped);
}

function wrappingToResolution(
  method: Method,
  wrapped: Format.Values.Value[]
): Resolution {
  if (
    wrapped.length > 0 &&
    wrapped[wrapped.length - 1].type.typeClass === "options"
  ) {
    //there's options
    const wrappedArguments = wrapped.slice(0, -1); //cut off options
    const options = (<Format.Values.OptionsValue>wrapped[wrapped.length - 1])
      .value;
    return {
      method,
      arguments: wrappedArguments,
      options
    };
  } else {
    //no options
    return {
      method,
      arguments: wrapped,
      options: {}
    };
  }
}

//doesn't separate out options from arguments & doesn't turn on loose
function* wrapForMethodRaw(
  method: Method,
  inputs: unknown[],
  { userDefinedTypes, allowOptions }: ResolveOptions,
  loose: boolean = false
): Generator<WrapRequest, Format.Values.Value[], WrapResponse> {
  debug("wrapping for method");
  if (method.inputs.length === inputs.length) {
    //no options case
    debug("no options");
    return yield* wrapMultiple(method.inputs, inputs, {
      userDefinedTypes,
      oldOptionsBehavior: true, //HACK
      loose,
      name: "<arguments>"
    });
  } else if (allowOptions && method.inputs.length === inputs.length - 1) {
    //options case
    debug("options");
    const inputsWithOptions = [
      ...method.inputs,
      { name: "<options>", type: { typeClass: "options" as const } }
    ];
    return yield* wrapMultiple(inputsWithOptions, inputs, {
      userDefinedTypes,
      oldOptionsBehavior: true, //HACK
      loose,
      name: "<arguments>"
    });
  } else {
    //invalid length case
    const orOneMore = allowOptions
      ? ` (or ${method.inputs.length + 1} counting transaction options)`
      : "";
    throw new TypeMismatchError(
      { typeClass: "tuple", memberTypes: method.inputs },
      inputs,
      "<arguments>",
      5,
      `Incorrect number of arguments (expected ${method.inputs.length}${orOneMore}, got ${inputs.length})`
    );
  }
}

export function* resolveAndWrap(
  methods: Method[],
  inputs: unknown[],
  { userDefinedTypes, allowOptions }: ResolveOptions
): Generator<WrapRequest, Resolution, WrapResponse> {
  //despite us having a good system for overload resolution, we want to
  //use it as little as possible!  That's because using it means we don't
  //get great error messages.  As such, we're going to do a bunch to filter
  //things beforehand, so that we get good error messages.
  if (methods.length === 1) {
    //if there's only one possibility, we just defer to wrapForMethod
    //if we ignore error messages this is silly... but we're not!
    //this is important for good error messages in this case
    return yield* wrapForMethod(methods[0], inputs, {
      userDefinedTypes,
      allowOptions
    });
  }
  //OK, so, there are multiple possibilities then.  let's try to filter things down by length.
  const possibleMatches = methods.filter(
    method => method.inputs.length === inputs.length
  );
  //but, we've also got to account for the possibility of options
  let possibleMatchesWithOptions: Method[] = [];
  let possibleOptions: Common.Options = {};
  if (allowOptions && inputs.length > 0) {
    //if options are allowed, we'll have to account for that.
    //*however*, in order to minimize the number of possibilities, we won't
    //use these unless the last argument of inputs actually looks like an options!
    const lastInput = inputs[inputs.length - 1];
    let isOptionsPossible: boolean = true;
    try {
      const wrappedOptions = <Format.Values.OptionsValue>(
        yield* wrap({ typeClass: "options" }, lastInput, {
          name: "<options>",
          loose: true,
          oldOptionsBehavior: true, //HACK
          userDefinedTypes
        })
      );
      possibleOptions = wrappedOptions.value;
    } catch (error) {
      if (error instanceof TypeMismatchError) {
        isOptionsPossible = false;
      } else {
        throw error; //rethrow unexpected errors
      }
    }
    if (isOptionsPossible) {
      possibleMatchesWithOptions = methods.filter(
        method => method.inputs.length === inputs.length - 1
      );
    }
  }
  debug("possibleMatches: %o", possibleMatches);
  debug("possibleMatchesWithOptions: %o", possibleMatchesWithOptions);
  //if there's now only one possibility, great!
  if (possibleMatches.length === 1 && possibleMatchesWithOptions.length === 0) {
    //only one possibility, no options. we can just defer to wrapMultiple.
    //(again, point is to have good error messaging)
    debug("only one possibility, no options");
    const method = possibleMatches[0];
    return {
      method,
      arguments: yield* wrapMultiple(method.inputs, inputs, {
        userDefinedTypes,
        loose: true,
        name: "<arguments>"
      }),
      options: {}
    };
  } else if (
    possibleMatchesWithOptions.length === 1 &&
    possibleMatches.length === 0
  ) {
    //only one possibility, with options.  moreover, we already determined the options
    //above, so we can once again just defer to wrapMultiple
    debug("only one possiblity, with options");
    const method = possibleMatchesWithOptions[0];
    return {
      method,
      arguments: yield* wrapMultiple(method.inputs, inputs, {
        userDefinedTypes,
        loose: true,
        name: "<arguments>"
      }),
      options: possibleOptions
    };
  } else if (
    possibleMatches.length === 0 &&
    possibleMatchesWithOptions.length === 0
  ) {
    debug("no possibilities");
    //nothing matches!
    throw new NoOverloadsMatchedError(methods, inputs, userDefinedTypes);
  }
  //if all of our attempts to avoid it have failed, we'll have to actually use
  //our overload resolution system. note how we do *not* turn on loose in this
  //case!
  debug("attempting overload resolution");
  let resolutions: Resolution[] = [];
  for (const method of methods) {
    let wrapped: Format.Values.Value[];
    try {
      //note this part takes care of options for us...
      //although yes this means options will be re-wrapped, oh well
      wrapped = yield* wrapForMethodRaw(method, inputs, {
        userDefinedTypes,
        allowOptions
      });
    } catch (error) {
      //if there's an error, don't add it
      debug("failed: %O", method);
      debug("because: %O", error);
      continue;
    }
    //note that options and arguments here are both not correct, but we'll
    //fix them up later!
    debug("adding: %O", method);
    resolutions.push({ method, arguments: wrapped, options: {} });
  }
  //now: narrow it down to the most specific one(s)
  debug("resolutions: %O", resolutions);
  resolutions = resolutions.filter(resolution =>
    resolutions.every(
      comparisonResolution =>
        !isMoreSpecificMultiple(
          comparisonResolution.arguments,
          resolution.arguments,
          userDefinedTypes
        ) ||
        //because the comparison is nonstrict, this comparison is added to
        //effectively make it strict
        // i.e. we have !(x<=y) but we want !(x<y), i.e.,
        // !(x<=y) | x=y, i.e., !(x<=y) | (x<=y & y<=x),
        // i.e., !(x<=y) | y<=x
        isMoreSpecificMultiple(
          resolution.arguments,
          comparisonResolution.arguments,
          userDefinedTypes
        )
    )
  );
  debug("resolutions remaining: %O", resolutions);
  switch (resolutions.length) {
    case 0:
      //no resolution worked
      throw new NoOverloadsMatchedError(methods, inputs, userDefinedTypes);
    case 1:
      //there was a most specific resolution; fix up options and arguments
      //before returning
      const { method, arguments: wrapped } = resolutions[0];
      return wrappingToResolution(method, wrapped);
    default:
      //no unique most-specific resolution
      throw new NoUniqueBestOverloadError(resolutions);
  }
}
