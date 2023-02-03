import SourceLine from "src/components/composed/Debugger/Sources/Source/SourceLine";
import { highlightSourceContent } from "src/utils/debugger";
import type { Source as SourceType, SourceRange } from "src/utils/debugger";

interface SourceProps {
  source: SourceType;
  sourceRange: SourceRange;
}

function Source({ source, sourceRange }: SourceProps): JSX.Element {
  const lines = highlightSourceContent(source).split("\n");
  const { start, end } = sourceRange;
  const lineNumberGutterWidth = lines.length.toString().length;

  return (
    <pre>
      {lines.map((line, index) => {
        const key = `${source.id}-line-${index}`;
        const selected =
          source.id === sourceRange.source.id &&
          index >= start.line &&
          (end.line === null ||
            end.column === null ||
            (end.column === 0 && index < end.line) ||
            (end.column > 0 && index <= end.line));
        const multiline = start.line !== end.line;

        const props = {
          key,
          line,
          lineNumber: index + 1,
          lineNumberGutterWidth,
          lastLine: index === lines.length - 1,
          multiline,
          selected
        };

        return <SourceLine {...props} />;
      })}
    </pre>
  );
}

export default Source;
