import { useEffect, useState } from "react";
import type { Session } from "src/components/composed/Debugger/utils";
import { createStyles } from "@mantine/core";

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
    paddingLeft: 10,
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors["truffle-brown"][8] : "white"
  }
}));

type StackArgs = {
  session: Session;
  currentStep: string;
};

function Stack({ session, currentStep }: StackArgs): JSX.Element | null {
  const { classes } = useStyles();
  const [output, setOutput] = useState<JSX.Element[] | null>(null);
  // when the debugger step changes, update variables
  useEffect(() => {
    async function getStack() {
      const stack = session.view(
        session.selectors.stacktrace.current.callstack
      );
      if (!stack) return;
      const entries = stack.map((stackItem: any, index: number) => {
        const functionNameDisplay =
          stackItem.functionName === undefined
            ? "unknown function"
            : stackItem.functionName;
        return (
          <div className="truffle-debugger-stack-item" key={index}>
            {stackItem.contractName} at {functionNameDisplay} (address{" "}
            {stackItem.address})
          </div>
        );
      });
      setOutput(entries);
    }
    getStack();
  }, [currentStep, session]);

  return (
    <div className={classes.stackContainer}>
      <div className={classes.sectionHeader}>Stack</div>
      <div className={classes.stack}>
        <pre className={classes.stackContent}>{output ? output : ""}</pre>
      </div>
    </div>
  );
}

export default Stack;
