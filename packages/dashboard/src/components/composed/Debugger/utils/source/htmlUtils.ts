export function removeCompleteSpanPairs(spanTags: string[] | null) {
  if (spanTags === null) return [];
  let stillNeedsProcessing: boolean = true;
  while (stillNeedsProcessing) {
    let spanPairRemovedThisPass: boolean = false;
    for (let index = 0; index < spanTags.length - 1; index++) {
      if (
        spanTags[index].startsWith("<span") &&
        spanTags[index + 1] === "</span>"
      ) {
        spanTags.splice(index, 2); //remove the pair
        spanPairRemovedThisPass = true;
        break;
      }
    }
    // when we don't remove anything else it means we've gotten all pairs
    if (!spanPairRemovedThisPass) {
      stillNeedsProcessing = false;
    }
  }
  return spanTags;
}

export function completeMultilineSpans(sourceLines: string[]) {
  let openTags: string[] = [];
  return sourceLines.reduce((a, line) => {
    let processedLine: string = "";
    let numberOfOpenTags: number = openTags.length;
    const spanTags = line.match(/(<span[^>]+>|<\/span>)/g);

    const incompleteSpanTags = removeCompleteSpanPairs(spanTags);
    // start the line with all open tags
    processedLine = openTags.join("");
    for (const incompleteTag of incompleteSpanTags) {
      if (incompleteTag === "</span>") {
        openTags.pop();
        numberOfOpenTags = numberOfOpenTags - 1;
      } else {
        openTags.push(incompleteTag);
        numberOfOpenTags = numberOfOpenTags + 1;
      }
    }
    processedLine = processedLine + line + "</span>".repeat(numberOfOpenTags);
    a.push(processedLine);
    return a;
  }, [] as string[]);
}
