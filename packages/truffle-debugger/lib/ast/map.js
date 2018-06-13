import debugModule from "debug";
const debug = debugModule("debugger:ast:map");

import IntervalTree from "node-interval-tree";


/**
 * @private
 */
export function getRange(node) {
  // src: "<start>:<length>:<_>"
  // returns [start, end]
  let [start, length] = node.src
    .split(":")
    .slice(0, 2)
    .map( (i) => parseInt(i) );

  return [start, start + length];
}

/**
 * @private
 */
export function rangeNodes(node, pointer = "") {
  if (node instanceof Array) {
    return [].concat(
      ...node.map( (sub, i) => rangeNodes(sub, `${pointer}/${i}`) )
    );
  } else if (node instanceof Object) {
    let results = [];

    if (node.src) {
      results.push({pointer, range: getRange(node)});
    }

    return results.concat(
      ...Object.keys(node).map(
        (key) => rangeNodes(node[key], `${pointer}/${key}`)
      )
    );
  } else {
    return [];
  }
}

/**
 * @private
 */
export function findRange(node, sourceStart, sourceLength) {
  let ranges = rangeNodes(node);
  let tree = new IntervalTree();

  ranges.forEach( ({range, pointer}) => {
    let [start, end] = range;

    tree.insert(start, end, {range, pointer});
  });

  let sourceEnd = sourceStart + sourceLength;

  let overlapping = tree.search(sourceStart, sourceEnd);

  // find nodes that fully contain requested range,
  // return longest pointer
  return overlapping
    .filter( ({range}) => sourceStart >= range[0] && sourceEnd <= range[1] )
    .map( ({pointer}) => pointer )
    .reduce( (a, b) => a.length > b.length ? a : b, "" );
}
