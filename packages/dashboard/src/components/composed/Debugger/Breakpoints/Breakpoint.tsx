import type { BreakpointType } from "src/utils/debugger";
type BreakpointProps = {
  sourceName: string;
  line: number;
  sourceId: string;
  handleBreakpointComponentClick: (arg: BreakpointType) => void;
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
          sourceId,
          line: line.toString()
        })
      }
    >
      {sourceName} - line {line}
    </div>
  );
}

export default Breakpoint;
