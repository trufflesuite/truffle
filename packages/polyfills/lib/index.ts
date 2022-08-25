/**
 * Very loosely inspired by the es-shims project.
 *
 * Rather than just blanket applying all the polyfills, we export a list of
 * polyfill modules that can be imported as submodules of this package, in case
 * someone wants to apply all in a programatic way. See
 * https://github.com/trufflesuite/truffle/blob/develop/packages/polyfills/README.md
 * for more info.
 */
export const polyfills = ["errorCause", "nodeAbortController"];

export default polyfills;
