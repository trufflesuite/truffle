import * as Types from "./types";
import { nativize } from "@truffle/codec/utils/conversion";

//NOTE: Definitely do not use this in real code!  For tests only!
//for convenience: invokes the nativize method on all the given variables, and changes them to
//the old format
export function nativizeDecoderVariables(variables: Types.StateVariable[]): {[name: string]: any} {
  return Object.assign({}, ...variables.map(
    ({name, value}) => ({[name]: nativize(value)})
  ));
  //note that the assignments are processed in order, so if multiple have same name, later
  //(i.e. more derived) will overwrite earlier (i.e. baser)... be aware!  I mean, this is the
  //right way to do overwriting, but it's still overwriting so still dangerous.
  //Again, don't use this in real code!
}

