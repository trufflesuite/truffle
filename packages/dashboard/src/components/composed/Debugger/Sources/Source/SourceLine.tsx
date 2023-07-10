import { createStyles } from "@mantine/core";

const useStyles = createStyles(() => ({
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
