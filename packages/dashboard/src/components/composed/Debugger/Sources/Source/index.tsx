import SourceLine from "src/components/composed/Debugger/Sources/Source/SourceLine";
import type { Source as SourceType, SourceRange } from "src/utils/debugger";
import { convertSourceToHtml } from "src/utils/debugger";

interface SourceProps {
  source: SourceType;
  sourceRange: SourceRange;
  sourceId: string;
}

function Source({ source, sourceRange, sourceId }: SourceProps): JSX.Element {
  const sourceLines = convertSourceToHtml({ source, sourceRange });

  const { start, end } = sourceRange;
  const lineNumberGutterWidth = sourceLines.length.toString().length;

  return (
    <pre className="truffle-debugger-source">
      {sourceLines.map((line: string, index: number) => {
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
          lastLine: index === sourceLines.length - 1,
          firstHighlightedLine,
          sourceId
        };

        return <SourceLine {...props} />;
      })}
    </pre>
  );
}

export default Source;
