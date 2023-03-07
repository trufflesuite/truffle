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
  scrollRef: any;
  firstHighlightedLine: boolean;
  sourceId: string;
}

function SourceLine({
  line,
  lineNumber,
  lineNumberGutterWidth,
  lastLine,
  scrollRef,
  firstHighlightedLine,
  sourceId
}: SourceLineProps): JSX.Element {
  const { classes } = useStyles();
  const {
    operations: { toggleDebuggerBreakpoint }
  } = useDash()!;

  if (!lastLine) line += "\n";
  const lineNumberDisplay =
    `<span class="${classes.lineNumber}">` +
    " ".repeat(lineNumberGutterWidth - lineNumber.toString().length) +
    lineNumber +
    "  " +
    "</span>";
  const handleClick = (({
    line,
    sourceId
  }: {
    line: number;
    sourceId: string;
  }) => {
    toggleDebuggerBreakpoint({ line, sourceId });
  }).bind(undefined, { line: lineNumber, sourceId });

  return firstHighlightedLine ? (
    <div
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: lineNumberDisplay + line }}
      ref={scrollRef}
    />
  ) : (
    <div
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: lineNumberDisplay + line }}
    />
  );
}

export default SourceLine;
