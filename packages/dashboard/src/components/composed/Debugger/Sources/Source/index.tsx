import SourceLine from "src/components/composed/Debugger/Sources/Source/SourceLine";
import LineNumber from "src/components/composed/Debugger/Sources/Source/LineNumber";
import type {
  Source as SourceType,
  SourceRange
} from "src/components/composed/Debugger/utils";
import { convertSourceToHtml } from "src/components/composed/Debugger/utils";
import { createStyles, Flex } from "@mantine/core";

const useStyles = createStyles(theme => ({
  sourceContainer: {
    overflow: "scroll",
    height: "100%",
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors["truffle-brown"][8] : "white"
  },
  source: {
    paddingTop: 15,
    paddingLeft: 15
  },
  lineNumbersContainer: {
    height: 22,
    display: "flex",
    flexDirection: "column"
  },
  sourceLineContainer: {
    height: 22,
    display: "flex",
    flexDirection: "column"
  }
}));

interface SourceProps {
  source: SourceType;
  sourceRange: SourceRange;
}

function Source({ source, sourceRange }: SourceProps): JSX.Element {
  const { classes } = useStyles();
  const rawSourceLines = convertSourceToHtml({ source, sourceRange });

  const { start, end } = sourceRange;
  const lineNumberGutterWidth = rawSourceLines.length.toString().length;

  const lineNumbers: JSX.Element[] = [];
  const sourceLines: JSX.Element[] = [];

  rawSourceLines.forEach((line: string, index: number) => {
    const sourceLineKey = `${source.id}-sourceLine-${index}`;
    const lineNumberKey = `${source.id}-lineNumber-${index}`;
    const lineHasHighlighting =
      source.id === sourceRange.source.id &&
      index >= start.line &&
      (end.line === null ||
        end.column === null ||
        (end.column === 0 && index < end.line) ||
        (end.column > 0 && index <= end.line));
    const firstHighlightedLine = lineHasHighlighting && index === start.line;

    const lineNumber = index + 1;

    const sourceLineProps = {
      key: sourceLineKey,
      line,
      lineNumber,
      lineNumberGutterWidth,
      lastLine: index === rawSourceLines.length - 1,
      firstHighlightedLine,
      sourceId: source.id,
      lineHasHighlighting
    };

    const lineNumberProps = {
      key: lineNumberKey,
      lineHasHighlighting,
      lineNumber,
      lineNumberGutterWidth,
      sourceId: source.id
    };

    sourceLines.push(<SourceLine {...sourceLineProps} />);
    lineNumbers.push(<LineNumber {...lineNumberProps} />);
  });

  return (
    <div
      className={classes.sourceContainer}
      id={`source-${source.id.slice(-10)}`}
    >
      <pre className={classes.source}>
        <Flex>
          <div className={classes.lineNumbersContainer}>{lineNumbers}</div>
          <div className={classes.sourceLineContainer}>{sourceLines}</div>
        </Flex>
      </pre>
    </div>
  );
}

export default Source;
