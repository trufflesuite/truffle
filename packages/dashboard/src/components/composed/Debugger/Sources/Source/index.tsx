import SourceLine from "src/components/composed/Debugger/Sources/Source/SourceLine";
import type {
  Source as SourceType,
  SourceRange
} from "src/components/composed/Debugger/utils";
import { convertSourceToHtml } from "src/components/composed/Debugger/utils";
import { createStyles } from "@mantine/core";

const useStyles = createStyles(theme => ({
  sourceContainer: {
    overflow: "scroll",
    height: "100%",
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors["truffle-brown"][8] : "white"
  },
  source: {
    "&:hover": {
      cursor: "pointer"
    },
    "paddingTop": 15,
    "paddingLeft": 15
  }
}));

interface SourceProps {
  source: SourceType;
  sourceRange: SourceRange;
}

function Source({ source, sourceRange }: SourceProps): JSX.Element {
  const { classes } = useStyles();
  const sourceLines = convertSourceToHtml({ source, sourceRange });

  const { start, end } = sourceRange;
  const lineNumberGutterWidth = sourceLines.length.toString().length;
  return (
    <div
      className={classes.sourceContainer}
      id={`source-${source.id.slice(-10)}`}
    >
      <pre className={classes.source}>
        {sourceLines.map((line: string, index: number) => {
          const key = `${source.id}-line-${index}`;
          const selected =
            source.id === sourceRange.source.id &&
            index >= start.line &&
            (end.line === null ||
              end.column === null ||
              (end.column === 0 && index < end.line) ||
              (end.column > 0 && index <= end.line));
          const firstHighlightedLine = selected && index === start.line;

          const props = {
            key,
            line,
            lineNumber: index + 1,
            lineNumberGutterWidth,
            lastLine: index === sourceLines.length - 1,
            firstHighlightedLine,
            sourceId: source.id
          };

          return <SourceLine {...props} />;
        })}
      </pre>
    </div>
  );
}

export default Source;
