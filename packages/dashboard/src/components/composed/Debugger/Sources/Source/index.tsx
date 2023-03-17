import SourceLine from "src/components/composed/Debugger/Sources/Source/SourceLine";
import {
  highlightSourceContent,
  addTextHighlightedClass,
  finalizeSource
} from "src/utils/debugger";
import type { Source as SourceType, SourceRange } from "src/utils/debugger";

interface SourceProps {
  source: SourceType;
  sourceRange: SourceRange;
  sourceId: string;
}

function Source({ source, sourceRange, sourceId }: SourceProps): JSX.Element {
  // add comment markers for where spans will go later designating debugger
  // highlighting - comments so lowlight doesn't choke on html
  const sourceWithHighlightedMarkings = addTextHighlightedClass(
    source,
    sourceRange
  );
  // run the source through lowlight for syntax highlighting
  const highlightedLines = highlightSourceContent(
    sourceWithHighlightedMarkings
  ).split("\n");
  // replace comment markers with spans denoting the debugger's highlighted text
  const finishedLines = finalizeSource(highlightedLines);

  const { start, end } = sourceRange;
  const lineNumberGutterWidth = finishedLines.length.toString().length;

  return (
    <pre className="truffle-debugger-source">
      {finishedLines.map((line, index) => {
        const key = `${source.id}-line-${index}`;
        const selected =
          source.id === sourceRange.source.id &&
          index >= start.line &&
          (end.line === null ||
            end.column === null ||
            (end.column === 0 && index < end.line) ||
            (end.column > 0 && index <= end.line));
        const firstHighlightedLine = selected && index === start.line;

        const props = {
          key,
          line,
          lineNumber: index + 1,
          lineNumberGutterWidth,
          lastLine: index === finishedLines.length - 1,
          firstHighlightedLine,
          sourceId
        };

        return <SourceLine {...props} />;
      })}
    </pre>
  );
}

export default Source;
