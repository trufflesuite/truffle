import { createStyles } from "@mantine/core";
import { useDash } from "src/hooks";

const useStyles = createStyles((theme, _params, _getRef) => ({
  lineNumber: {
    color: theme.colorScheme === "dark" ? "#59534c" : "#c4b08d"
  },
  selected: {
    backgroundColor: theme.colorScheme === "dark" ? "#4444aa60" : "#ffff0050"
  },
  sourceLine: {
    height: 20,
    marginBottom: 2,
    display: "flex"
  },
  spacer: {
    minHeight: 16,
    minWidth: 16,
    height: 16,
    width: 16,
    marginRight: 5
  },
  breakpointSpacer: {
    minHeight: 16,
    minWidth: 16,
    height: 16,
    width: 16,
    backgroundColor: "#FA5252",
    borderRadius: 25,
    marginRight: 5
  }
}));

interface SourceLineProps {
  line: string;
  lineNumber: number;
  lineNumberGutterWidth: number;
  lastLine: boolean;
  firstHighlightedLine: boolean;
  sourceId: string;
}

function SourceLine({
  line,
  lineNumber,
  lineNumberGutterWidth,
  lastLine,
  sourceId
}: SourceLineProps): JSX.Element {
  const { classes } = useStyles();
  const {
    state: {
      debugger: { breakpoints }
    },
    operations: { toggleDebuggerBreakpoint }
  } = useDash()!;

  if (!lastLine) line += "\n";
  const lineNumberDisplay =
    `<span class="${classes.lineNumber}">` +
    " ".repeat(lineNumberGutterWidth - lineNumber.toString().length) +
    lineNumber +
    "  " +
    `</span>`;

  const spacer =
    breakpoints &&
    breakpoints[sourceId] &&
    breakpoints[sourceId].has(lineNumber) ? (
      <div className={classes.breakpointSpacer} />
    ) : (
      <div className={classes.spacer} />
    );

  const handleClick = () => {
    toggleDebuggerBreakpoint({ line: lineNumber, sourceId });
  };

  const lineId = `${sourceId.slice(-10)}-${lineNumber}`;

  return (
    <div className={classes.sourceLine} onClick={handleClick}>
      {spacer}
      <div
        id={lineId}
        dangerouslySetInnerHTML={{ __html: lineNumberDisplay + line }}
      />
    </div>
  );
}

export default SourceLine;
