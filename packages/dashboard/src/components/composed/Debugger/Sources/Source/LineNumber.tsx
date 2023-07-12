import { highlightedTextClass } from "src/components/composed/Debugger/utils";
import { createStyles } from "@mantine/core";
import { useDash } from "src/hooks";

interface LineNumberProps {
  lineHasHighlighting: boolean;
  lineNumber: number;
  lineNumberGutterWidth: number;
  sourceId: string;
}

const useStyles = createStyles(() => ({
  lineNumber: {
    "&:hover": {
      cursor: "pointer"
    },
    "display": "flex"
  },
  spacer: {
    minHeight: 22,
    minWidth: 22,
    width: 22,
    marginRight: 5
  },
  breakpointSpacerContainer: {
    minHeight: 22,
    minWidth: 22,
    width: 22,
    display: "flex",
    marginRight: 5,
    alignItems: "center"
  },
  breakpointSpacer: {
    width: 16,
    height: 16,
    backgroundColor: "#FA5252",
    borderRadius: 25
  }
}));

function LineNumber({
  lineHasHighlighting,
  lineNumberGutterWidth,
  sourceId,
  lineNumber
}: LineNumberProps): JSX.Element {
  const { classes } = useStyles();
  const {
    state: {
      debugger: { breakpoints }
    },
    operations: { toggleDebuggerBreakpoint }
  } = useDash()!;
  // if the line contains highlighting we highlight the line number as well
  const lineNumberDisplay = lineHasHighlighting ? (
    <span className={classes.lineNumber}>
      {" ".repeat(lineNumberGutterWidth - lineNumber.toString().length)}
      <span className={highlightedTextClass}>{lineNumber}</span>
      {"  "}
    </span>
  ) : (
    <span className={classes.lineNumber}>
      {" ".repeat(lineNumberGutterWidth - lineNumber.toString().length)}
      {lineNumber}
      {"  "}
    </span>
  );

  const spacer =
    breakpoints &&
    breakpoints[sourceId] &&
    breakpoints[sourceId].has(lineNumber) ? (
      <div className={classes.breakpointSpacerContainer}>
        <div className={classes.breakpointSpacer} />
      </div>
    ) : (
      <div className={classes.spacer} />
    );

  const handleClick = () => {
    toggleDebuggerBreakpoint({ line: lineNumber, sourceId });
  };

  return (
    <div onClick={handleClick} className={classes.lineNumber}>
      {spacer}
      {lineNumberDisplay}
    </div>
  );
}

export default LineNumber;
