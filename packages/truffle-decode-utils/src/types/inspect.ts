import debugModule from "debug";
const debug = debugModule("decode-utils:types:inspect");

import util from "util";

//we'll need to write a typing for the options type ourself, it seems; just
//going to include the relevant properties here
export interface InspectOptions {
  stylize?: (toMaybeColor: string, style?: string) => string;
  colors: boolean;
  breakLength: number;
}

//HACK -- inspect options are ridiculous, I swear >_>
export function cleanStylize(options: InspectOptions) {
  return Object.assign({}, ...Object.entries(options).map(
    ([key,value]) =>
      key === "stylize"
        ? {}
        : {[key]: value}
  ));
}
