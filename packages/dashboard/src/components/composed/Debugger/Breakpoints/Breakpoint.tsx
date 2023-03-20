import type { BreakpointType } from "src/utils/debugger";
type BreakpointProps = {
  sourceName: string;
  line: number;
  sourceId: string;
  handleBreakpointComponentClick: (arg: BreakpointType) => void;
  handleBreakpointDeleteClick: (arg: BreakpointType) => void;
};

function Breakpoint({
  sourceName,
  line,
  sourceId,
  handleBreakpointComponentClick,
  handleBreakpointDeleteClick
}: BreakpointProps): JSX.Element | null {
  return (
    <div className="truffle-debugger-breakpoint-group">
      <div
        className="truffle-debugger-breakpoint"
        onClick={() =>
          handleBreakpointComponentClick({
            sourceId,
            line: line.toString()
          })
        }
      >
        {sourceName} - line {line}
      </div>
      <div
        className="truffle-debugger-breakpoint-delete"
        onClick={() =>
          handleBreakpointDeleteClick({
            sourceId,
            line: line.toString()
          })
        }
      >
        X
      </div>
    </div>
  );
}

export default Breakpoint;
