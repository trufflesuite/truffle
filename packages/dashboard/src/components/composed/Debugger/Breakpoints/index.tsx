import { Source } from "src/utils/debugger";
import { useDash } from "src/hooks";
import * as path from "path";
import { BreakpointType } from "src/utils/debugger";
import Breakpoint from "src/components/composed/Debugger/Breakpoints/Breakpoint";

type BreakpointsArgs = {
  sources: Source[];
  handleBreakpointComponentClick: (breakpoint: BreakpointType) => void;
};

function Breakpoints({
  sources,
  handleBreakpointComponentClick
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
        />
      );
    }
  }
  return (
    <div className="truffle-debugger-breakpoints">
      <h2>breakpoints</h2>
      <pre>{breakpointsList}</pre>
    </div>
  );
}

export default Breakpoints;
