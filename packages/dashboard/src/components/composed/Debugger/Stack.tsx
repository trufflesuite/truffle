import { useEffect, useState } from "react";
import { createStyles, Flex } from "@mantine/core";
import { useDash } from "src/hooks";

const useStyles = createStyles(theme => ({
  sectionHeader: {
    height: 42,
    fontSize: 16,
    paddingTop: 10,
    paddingLeft: 16,
    backgroundColor:
      theme.colorScheme === "dark"
        ? `${theme.colors["truffle-beige"][8]}33`
        : theme.colors["truffle-beige"][2],
    borderBottom: "1px solid",
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][5]
        : `${theme.colors["truffle-beige"][5]}73`
  },
  stackContainer: {
    overflow: "hidden",
    height: "30%",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 4,
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][5]
        : `${theme.colors["truffle-beige"][5]}73`
  },
  stack: {
    overflow: "scroll",
    height: "100%",
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors["truffle-brown"][8] : "white"
  },
  stackContent: {
    paddingLeft: 10
  }
}));

function Stack(): JSX.Element | null {
  const { classes } = useStyles();
  const {
    state: {
      debugger: { session }
    }
  } = useDash()!;

  const [stackReport, setStackReport] = useState<JSX.Element[] | null>(null);
  // when the debugger step changes, update variables
  useEffect(() => {
    async function getStack() {
      // we don't render this component until session is defined
      const report = session!.view(
        session!.selectors.stacktrace.current.report
      );
      if (!report) return;
      // we need to display this information in the reverse order
      report.reverse();
      setStackReport(report);
    }
    getStack();
  }, [session!.view(session!.selectors.trace.index)]);

  const output = stackReport
    ? stackReport.map((reportItem: any, index: number) => {
        const { address, contractName, functionName, isConstructor, type } =
          reportItem;
        let name: string;
        if (contractName && functionName) {
          name = `${contractName}.${functionName}`;
        } else if (contractName) {
          name =
            type === "external" && isConstructor
              ? `new ${contractName}`
              : contractName;
        } else if (functionName) {
          name = functionName;
        } else {
          name = "unknown function";
        }
        const displayAddress =
          address === undefined ? "unknown address" : address;
        const stackDisplay = `at ${name} [address ${displayAddress}]`;
        return <div key={index}>{stackDisplay}</div>;
      })
    : null;

  return (
    <Flex direction="column" className={classes.stackContainer}>
      <div className={classes.sectionHeader}>Stack</div>
      <div className={classes.stack}>
        <pre className={classes.stackContent}>{output}</pre>
      </div>
    </Flex>
  );
}

export default Stack;
