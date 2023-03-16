import type { SourceRange } from "src/utils/debugger";
type BreakpointProps = {
  sourceName: string;
  line: number;
  sourceId: string;
  handleBreakpointComponentClick: (sourceRange: SourceRange) => void;
};

function Breakpoint({
  sourceName,
  line,
  sourceId,
  handleBreakpointComponentClick
}: BreakpointProps): JSX.Element | null {
  return (
    <div
      className="truffle-debugger-breakpoint"
      onClick={() =>
        handleBreakpointComponentClick({
          start: {
            line,
            column: 0
          },
          end: {
            line,
            column: 0
          },
          // I don't know what trace index is but we don't need it for this
          traceIndex: 1,
          source: { id: sourceId }
        })
      }
    >
      {sourceName} - line {line}
    </div>
  );
}

export default Breakpoint;
