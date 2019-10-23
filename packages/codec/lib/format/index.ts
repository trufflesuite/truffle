import * as Types from "./types";
import * as Values from "./values";
import * as Errors from "./errors";

/**
 * Here's the decoder output format.
 * Most of this doesn't have explanatory documentation
 * because it's largely self-explanatory, but particularly
 * non-obvious parts have been documented for clarity.
 *
 * A note on optional fields: A number of types or values
 * have optional fields.  These contain helpful
 * but non-essential information, or information which
 * for technical reasons we can't guarantee we can determine.
 */

export { Types, Values, Errors };
