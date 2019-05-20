import debugModule from "debug";
const debug = debugModule("debugger:ast:map");

import IntervalTree from "node-interval-tree";
import jsonpointer from "json-pointer";
import { isSkippedNodeType } from "lib/helpers";

/**
 * @private
 */
export function getRange(node) {
  // src: "<start>:<length>:<_>"
  // returns [start, end]
  let [start, length] = node.src
    .split(":")
    .slice(0, 2)
    .map(i => parseInt(i));

  return [start, start + length];
}

/**
 * @private
 */
export function rangeNodes(node, pointer = "") {
  if (node instanceof Array) {
    return [].concat(
      ...node.map((sub, i) => rangeNodes(sub, `${pointer}/${i}`))
    );
  } else if (node instanceof Object) {
    let results = [];

    if (node.src !== undefined && node.id !== undefined) {
      //there are some "pseudo-nodes" with a src but no id.
      //these will cause problems, so we want to exclude them.
      //(to my knowledge this only happens with the externalReferences
      //to an InlineAssembly node, so excluding them just means we find
      //the InlineAssembly node instead, which is fine)
      results.push({ pointer, range: getRange(node) });
    }

    return results.concat(
      ...Object.keys(node).map(key =>
        rangeNodes(node[key], `${pointer}/${key}`)
      )
    );
  } else {
    return [];
  }
}

/**
 * @private
 */
export function findOverlappingRange(node, sourceStart, sourceLength) {
  let ranges = rangeNodes(node);
  let tree = new IntervalTree();

  for (let { range, pointer } of ranges) {
    let [start, end] = range;
    tree.insert(start, end, { range, pointer });
  }

  let sourceEnd = sourceStart + sourceLength;

  return tree.search(sourceStart, sourceEnd);
  //returns everything overlapping the given range
}

/**
 * @private
 */
export function findRange(node, sourceStart, sourceLength) {
  // find nodes that fully contain requested range,
  // return longest pointer
  let sourceEnd = sourceStart + sourceLength;
  return findOverlappingRange(node, sourceStart, sourceLength)
    .filter(({ range }) => sourceStart >= range[0] && sourceEnd <= range[1])
    .map(({ pointer }) => pointer)
    .reduce((a, b) => (a.length > b.length ? a : b), "");
}

/**
 * @private
 */
export function anyNonSkippedInRange(node, sourceStart, sourceLength) {
  let sourceEnd = sourceStart + sourceLength;
  return findOverlappingRange(node, sourceStart, sourceLength).some(
    ({ range, pointer }) =>
      sourceStart <= range[0] && //we want to go by starting line
      range[0] < sourceEnd &&
      !isSkippedNodeType(jsonpointer.get(node, pointer))
    //NOTE: this doesn't actually catch everything skipped!  But doing better
    //is hard
  );
}
