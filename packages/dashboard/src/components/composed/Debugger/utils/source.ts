import { unified } from "unified";
import rehypeStringify from "rehype-stringify";
import { lowlight } from "lowlight/lib/core";
import { solidity } from "highlightjs-solidity";
import { selectors as $ } from "@truffle/debugger";
import type {
  Session,
  Source,
  SourceRange
} from "src/components/composed/Debugger/utils";

export function convertSourceToHtml({
  source,
  sourceRange
}: {
  source: Source;
  sourceRange: SourceRange;
}) {
  // add comment markers for where spans will go later designating debugger
  // highlighting - comments so lowlight doesn't choke on html
  const sourceWithHighlightedMarkings = addTextHighlightedClass(
    source,
    sourceRange
  );

  // run the source through lowlight for syntax highlighting
  const sourceWithSyntaxHighlighting = addSyntaxHighlighting(
    sourceWithHighlightedMarkings
  ).split("\n");

  // HACK: we need to detect where lowlight added spans for multiline comments
  // and add more because we break the source into lines
  const sourceWithAddedSpans = addMultilineCommentSpans(
    sourceWithSyntaxHighlighting
  );

  // replace comment markers with spans denoting the debugger's highlighted text
  return replaceTextHighlightedMarkings(sourceWithAddedSpans);
}

export function addMultilineCommentSpans(sourceLines: string[]) {
  let inMultilineComment: boolean = false;
  const lowlightCommentSpan = `<span class="hljs-comment">`;
  const closingSpan = `</span>`;
  const sourceWithSpans: string[] = [];
  for (const line of sourceLines) {
    if (
      !inMultilineComment &&
      line.includes(lowlightCommentSpan) &&
      !line.slice(line.indexOf(lowlightCommentSpan)).includes(closingSpan)
    ) {
      // line where a multiline comment begins with no closing span
      inMultilineComment = true;
      sourceWithSpans.push(line + closingSpan);
    } else if (inMultilineComment && !line.includes(closingSpan)) {
      // line in the middle of a multiline comment without closing span
      sourceWithSpans.push(lowlightCommentSpan + line + closingSpan);
    } else if (inMultilineComment && line.includes(closingSpan)) {
      // line where a multiline comment begins
      sourceWithSpans.push(lowlightCommentSpan + line);
      inMultilineComment = false;
    } else {
      // line of code not in a multiline comment
      sourceWithSpans.push(line);
    }
  }
  return sourceWithSpans;
}

export function getCurrentSourceRange(session: Session) {
  const traceIndex = session.view($.trace.index);
  const { id } = session.view($.sourcemapping.current.source);
  const {
    lines: { start, end }
  } = session.view($.sourcemapping.current.sourceRange);
  return {
    traceIndex,
    source: { id },
    start,
    end
  };
}

lowlight.registerLanguage("solidity", solidity);
const processor = unified().use(rehypeStringify);

export function addSyntaxHighlighting(source: Source) {
  const highlighted = lowlight.highlight("solidity", source.contents);
  return processor.stringify(highlighted);
}

const textHighlightingBeginsMarker = ` /****truffle-debugger-highlight-begin****/`;
const textHighlightingEndsMarker = ` /****truffle-debugger-highlight-end****/`;
const highlightedTextSpan = `<span class="truffle-debugger-text-highlighted">`;
const closingSpan = `</span>`;
// lowlight wraps our markers in spans which we need to remove when we replace
// the markers with our spans for highlighting
const highlightJsCommentSpan = `<span class=\"hljs-comment\">`;
export function addTextHighlightedClass(
  source: Source,
  sourceRange: SourceRange
) {
  const editedLines = source.contents.split("\n").map((line, index) => {
    const { start, end } = sourceRange;
    const lineHasHighlighting =
      source.id === sourceRange.source.id &&
      index >= start.line &&
      index <= end.line!;

    if (!lineHasHighlighting) return line;

    const wholeLineHighlighted =
      (lineHasHighlighting &&
        // the line is in the middle of a block highlighted section
        start.line < index &&
        index < end.line!) ||
      // just the current line is highlighted
      (index === start.line &&
        start.column === 0 &&
        end.column === line.length - 1) ||
      // this line is the start of block highlighting
      (index === start.line && start.column === 0 && index < end.line!) ||
      // this line is the last line of block highlighting
      (index === end.line! &&
        index > start.line &&
        end.column === line.length - 1);
    if (wholeLineHighlighted) {
      const index = indexOfFirstNonWhitespaceChar(line);
      // avoid highlighting the whitespace at the beginning of lines
      if (index !== -1) {
        const segments = [line.slice(0, index), line.slice(index)];
        return (
          segments[0] +
          textHighlightingBeginsMarker +
          segments[1] +
          textHighlightingEndsMarker
        );
      }
      return textHighlightingBeginsMarker + line + textHighlightingEndsMarker;
    }

    let editedLine;
    // highlighting contained within a single line
    if (start.line === index && end.line === index) {
      const segments = [
        line.slice(0, start.column),
        line.slice(start.column, end.column!),
        line.slice(end.column!)
      ];
      editedLine =
        segments[0] +
        textHighlightingBeginsMarker +
        segments[1] +
        textHighlightingEndsMarker +
        segments[2];
    }
    // highlighting starting on a line but ending on another
    if (start.line === index && end.line! > index) {
      const segments = [line.slice(0, start.column), line.slice(start.column)];
      editedLine =
        segments[0] +
        textHighlightingBeginsMarker +
        segments[1] +
        textHighlightingEndsMarker;
    }
    // highlighting started on a previous line but ending on the current one
    if (start.line < index && end.line === index) {
      const segments = [line.slice(0, end.column!), line.slice(end.column!)];
      editedLine =
        textHighlightingBeginsMarker +
        segments[0] +
        textHighlightingEndsMarker +
        segments[1];
    }
    return editedLine;
  });

  return {
    ...source,
    contents: editedLines.join("\n")
  };
}

const indexOfFirstNonWhitespaceChar = (str: string) => {
  return str.split("").findIndex(letter => letter !== " " && letter !== "\t");
};

export function replaceTextHighlightedMarkings(lines: string[]) {
  return lines.map(line => {
    // we need to add the space to make lowlight parse the comment correctly
    // as a comment as there are some cases where it marks it incorrectly
    return line
      .replace(
        " " +
          highlightJsCommentSpan +
          textHighlightingBeginsMarker.slice(1) +
          closingSpan,
        highlightedTextSpan
      )
      .replace(
        " " +
          highlightJsCommentSpan +
          textHighlightingEndsMarker.slice(1) +
          closingSpan,
        closingSpan
      );
  });
}
