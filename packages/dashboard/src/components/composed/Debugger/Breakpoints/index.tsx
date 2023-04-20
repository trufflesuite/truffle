import { Source } from "src/components/composed/Debugger/utils";
import { useDash } from "src/hooks";
import * as path from "path";
import { BreakpointType } from "src/components/composed/Debugger/utils";
import Breakpoint from "src/components/composed/Debugger/Breakpoints/Breakpoint";
import { createStyles } from "@mantine/core";

const useStyles = createStyles(theme => ({
  breakpointsContainer: {
    overflow: "hidden",
    height: "30%",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 4,
    marginBottom: 20,
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][5]
        : `${theme.colors["truffle-beige"][5]}73`
  },
  sectionHeader: {
    height: 42,
    fontSize: 16,
    paddingTop: 10,
    paddingLeft: 16,
    backgroundColor:
      theme.colorScheme === "dark"
        ? `${theme.colors["truffle-beige"][8]}33`
        : theme.colors["truffle-beige"][2],
    borderBottom: "1px solid",
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][5]
        : `${theme.colors["truffle-beige"][5]}73`
  },
  breakpoints: {
    overflow: "scroll",
    height: "100%"
  }
}));

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
  const { classes } = useStyles();
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
    <div className={classes.breakpointsContainer}>
      <div className={classes.sectionHeader}>Breakpoints</div>
      <div className={classes.breakpoints}>
        <pre>{breakpointsList}</pre>
      </div>
    </div>
  );
}

export default Breakpoints;
