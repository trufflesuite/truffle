import { createStyles } from "@mantine/core";
import { useDash } from "src/hooks";

const useStyles = createStyles((theme, _params, _getRef) => ({
  lineNumber: {
    color: theme.colorScheme === "dark" ? "#59534c" : "#c4b08d"
  },
  selected: {
    backgroundColor: theme.colorScheme === "dark" ? "#4444aa60" : "#ffff0050"
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
  let lineNumberDisplay =
    `<span class="${classes.lineNumber}">` +
    " ".repeat(lineNumberGutterWidth - lineNumber.toString().length) +
    lineNumber +
    "  " +
    `</span>`;

  const spacerClass =
    breakpoints &&
    breakpoints[sourceId] &&
    breakpoints[sourceId].has(lineNumber)
      ? "source-line-spacer-breakpoint"
      : "source-line-spacer";

  const handleClick = () => {
    toggleDebuggerBreakpoint({ line: lineNumber, sourceId });
  };

  const lineId = `${sourceId.slice(-10)}-${lineNumber}`;

  return (
    <div className="source-line" onClick={handleClick}>
      <div className={spacerClass} />
      <div
        id={lineId}
        dangerouslySetInnerHTML={{ __html: lineNumberDisplay + line }}
      />
    </div>
  );
}

export default SourceLine;
