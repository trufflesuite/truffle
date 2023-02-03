import { createStyles } from "@mantine/core";

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
  multiline: boolean;
  selected: boolean;
}

function SourceLine({
  line,
  lineNumber,
  lineNumberGutterWidth,
  lastLine,
  // multiline,
  selected
}: SourceLineProps): JSX.Element {
  const { classes } = useStyles();

  if (!lastLine) line += "\n";
  const lineNumberDisplay =
    `<span class="${classes.lineNumber}">` +
    " ".repeat(lineNumberGutterWidth - lineNumber.toString().length) +
    lineNumber +
    "  " +
    "</span>";

  return (
    <div
      dangerouslySetInnerHTML={{ __html: lineNumberDisplay + line }}
      className={selected ? classes.selected : ""}
    />
  );
}

export default SourceLine;
