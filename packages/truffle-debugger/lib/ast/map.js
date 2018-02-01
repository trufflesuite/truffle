
export function getBounds(node) {
  // src: "<start>:<length>:<_>"
  return node.src
    .split(":")
    .slice(0, 2)
    .map( (i) => parseInt(i) );
}


export function findRange(node, sourceStart, sourceLength, pointer = "") {
  // preconditions:
  //   - node.src is within bounds
  //   - children src's do not overlap (TODO doublecheck)
  //
  // base cases:
  //   - node has no children
  //   - children don't match bounds
  // (return `pointer` as best match based on precondition)
  //
  // otherwise:
  //   recurse with updated pointer and node

  // base case - handle leaf nodes
  let children = node.children || [];

  // check for child range match
  for (let [index, child] of children.entries()) {
    let [nodeStart, nodeLength] = getBounds(child);

    if (
      nodeStart <= sourceStart &&
      nodeStart + nodeLength >= sourceStart + sourceLength
    ) {
      let childPointer = `${pointer}/children/${index}`;

      return findRange(child, sourceStart, sourceLength, childPointer);
    }
  }

  // otherwise
  return pointer;
}
