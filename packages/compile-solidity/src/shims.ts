import type * as Common from "@truffle/compile-common";

/**
 * Converts solc's link references format into the @truffle/compile-common
 * link references format.
 */
export const formatLinkReferences = (
  /**
   * @dev type matches solc's Compiler output JSON
   */
  linkReferences: {
    [sourcePath: string]: {
      [libraryName: string]: Array<{ start: 0; length: 20 }>;
    };
  }
): Common.LinkReference[] => {
  if (!linkReferences) {
    return [];
  }

  // convert to flat list
  const libraryLinkReferences = Object.values(linkReferences)
    .map(fileLinks =>
      Object.entries(fileLinks).map(([name, links]) => ({
        name,
        links
      }))
    )
    .reduce((a, b) => [...a, ...b], []);

  // convert to { offsets, length, name } format
  return libraryLinkReferences.map(({ name, links }) => ({
    offsets: links.map(({ start }) => start),
    length: links[0].length, // HACK just assume they're going to be the same
    name
  }));
};

/**
 * This function converts contract bytecodes' bytes strings from solc's native
 * format into the @truffle/compile-common internal format.
 *
 * solc produces bytecodes where the bytes corresponding to link references are
 * not necessarily zero, but Truffle's format requires that these bytes MUST be
 * zero.
 *
 * To be forgiving to the full range of possible input, this function accepts
 * `undefined` as value for `bytes`, e.g., for `abstract contract`s.
 *
 * This function produces a spec-compliant Common.Bytecode object or undefined.
 */
export const zeroLinkReferences = (options: {
  /**
   * Link references in compile-common format (not Solidity's format), for
   * which `zeroLinkReferences()` will convert the corresponding bytes to zero.
   */
  linkReferences: Common.LinkReference[];

  /**
   * Hexadecimal string with NO prefix, straight from the Solidity output.
   * For abstract contracts, this might be undefined
   */
  bytes: string | undefined;
}): Common.Bytecode => {
  const { linkReferences, bytes: inputBytes } = options;

  if (inputBytes === undefined) {
    return {
      bytes: "",
      linkReferences: []
    };
  }

  // inline link references - start by flattening the offsets
  const flattenedLinkReferences = linkReferences
    // map each link ref to array of link refs with only one offset
    .map(({ offsets, length, name }) =>
      offsets.map(offset => ({ offset, length, name }))
    )
    // flatten
    .reduce((a, b) => [...a, ...b], []);

  // then overwite bytes with zeroes
  const outputBytes = flattenedLinkReferences.reduce(
    (bytes, { offset, length }) => {
      // length is a byte offset
      const characterLength = length * 2;
      const start = offset * 2;

      const zeroes = "0".repeat(characterLength);

      return `${bytes.substring(0, start)}${zeroes}${bytes.substring(
        start + characterLength
      )}`;
    },
    inputBytes
  );

  return { linkReferences, bytes: outputBytes };
};
