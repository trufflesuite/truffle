import type { BreakpointType } from "src/components/composed/Debugger/utils";
import { createStyles } from "@mantine/core";

const useStyles = createStyles(() => ({
  breakpointGroup: {
    display: "flex",
    marginBottom: 5
  },
  breakpointDelete: {
    "&:hover": {
      cursor: "pointer"
    },
    "borderRadius": 8,
    "backgroundColor": "#FA5252",
    "width": 16,
    "height": 16,
    "marginRight": 16
  },
  breakpoint: {
    "&:hover": {
      cursor: "pointer"
    }
  }
}));

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
  const { classes } = useStyles();
  return (
    <div className={classes.breakpointGroup}>
      <div
        className={classes.breakpointDelete}
        onClick={() =>
          handleBreakpointDeleteClick({
            sourceId,
            line
          })
        }
      ></div>
      <div
        className={classes.breakpoint}
        onClick={() =>
          handleBreakpointComponentClick({
            sourceId,
            line
          })
        }
      >
        {sourceName} - line {line}
      </div>
    </div>
  );
}

export default Breakpoint;
