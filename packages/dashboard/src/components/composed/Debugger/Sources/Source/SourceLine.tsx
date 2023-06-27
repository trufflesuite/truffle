import { createStyles } from "@mantine/core";

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
  content: {
    height: 22,
    display: "flex"
  }
}));

interface SourceLineProps {
  line: string;
  lineNumber: number;
  lastLine: boolean;
  firstHighlightedLine: boolean;
  sourceId: string;
}

function SourceLine({
  line,
  lineNumber,
  lastLine,
  sourceId
}: SourceLineProps): JSX.Element {
  const { classes } = useStyles();

  if (!lastLine) line += "\n";

  const lineId = `${sourceId.slice(-10)}-${lineNumber}`;

  return (
    <div className={classes.sourceLine}>
      <div
        className={classes.content}
        id={lineId}
        dangerouslySetInnerHTML={{ __html: line }}
      />
    </div>
  );
}

export default SourceLine;
