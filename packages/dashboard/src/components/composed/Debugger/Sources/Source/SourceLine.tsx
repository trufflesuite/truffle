import { createStyles } from "@mantine/core";
import type { SourceRange } from "src/utils/debugger";

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
  // multiline: boolean;
  selected: boolean;
  sourceRange: SourceRange;
}

function SourceLine({
  line,
  lineNumber,
  lineNumberGutterWidth,
  lastLine,
  // multiline,
  selected,
  sourceRange
}: SourceLineProps): JSX.Element {
  const { classes } = useStyles();

  if (!lastLine) line += "\n";
  const lineNumberDisplay =
    `<span class="${classes.lineNumber}">` +
    " ".repeat(lineNumberGutterWidth - lineNumber.toString().length) +
    lineNumber +
    "  " +
    "</span>";

  return <div dangerouslySetInnerHTML={{ __html: lineNumberDisplay + line }} />;
}

export default SourceLine;
