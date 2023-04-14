import { Source } from "src/utils/debugger";
import { useDash } from "src/hooks";
import * as path from "path";
import { BreakpointType } from "src/utils/debugger";
import Breakpoint from "src/components/composed/Debugger/Breakpoints/Breakpoint";

type BreakpointsArgs = {
  sources: Source[];
  handleBreakpointComponentClick: (breakpoint: BreakpointType) => void;
  handleBreakpointDeleteClick: (breakpoint: BreakpointType) => void;
};

function Breakpoints({
  sources,
  handleBreakpointComponentClick,
  handleBreakpointDeleteClick
}: BreakpointsArgs): JSX.Element | null {
  const {
    state: {
      debugger: { breakpoints }
    }
  } = useDash()!;
  const breakpointsList: JSX.Element[] = [];
  for (const source of sources) {
    if (
      breakpoints[source.id] === undefined ||
      breakpoints[source.id].size === 0
    ) {
      continue;
    }
    if (!source?.sourcePath) {
      continue;
    }
    const iterator = breakpoints[source.id].values();
    const sourceName = path.basename(source.sourcePath);
    for (const line of iterator) {
      breakpointsList.push(
        <Breakpoint
          key={`${source.id}${line.toString()}`}
          sourceName={sourceName}
          line={line}
          sourceId={source.id}
          handleBreakpointComponentClick={handleBreakpointComponentClick}
          handleBreakpointDeleteClick={handleBreakpointDeleteClick}
        />
      );
    }
  }
  return (
    <div className="truffle-debugger-breakpoints-container">
      <div className="truffle-debugger-breakpoints">
        <div className="truffle-debugger-section-header">Breakpoints</div>
        <pre>{breakpointsList}</pre>
      </div>
    </div>
  );
}

export default Breakpoints;
