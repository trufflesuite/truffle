import { createStyles } from "@mantine/core";
import { useDash } from "src/hooks";
import {
  highlightedTextTag,
  closingHighlightedTextTag
} from "src/components/composed/Debugger/utils";

const useStyles = createStyles((theme, _params, _getRef) => ({
  lineNumber: {
    color: theme.colorScheme === "dark" ? "#59534c" : "#c4b08d"
  },
  selected: {
    backgroundColor: theme.colorScheme === "dark" ? "#4444aa60" : "#ffff0050"
  },
  sourceLine: {
    height: 22,
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
  lineHasHighlighting: boolean;
}

function SourceLine({
  line,
  lineNumber,
  lineNumberGutterWidth,
  lastLine,
  sourceId,
  lineHasHighlighting
}: SourceLineProps): JSX.Element {
  const { classes } = useStyles();
  const {
    state: {
      debugger: { breakpoints }
    },
    operations: { toggleDebuggerBreakpoint }
  } = useDash()!;

  if (!lastLine) line += "\n";
  // if the line contains highlighting we highlight the line number as well
  const lineNumberDisplay = lineHasHighlighting
    ? `<span class="${classes.lineNumber}">` +
      " ".repeat(lineNumberGutterWidth - lineNumber.toString().length) +
      highlightedTextTag +
      lineNumber +
      closingHighlightedTextTag +
      "  " +
      `</span>`
    : `<span class="${classes.lineNumber}">` +
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
