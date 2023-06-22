import { useEffect, useState } from "react";
import type { Session } from "src/components/composed/Debugger/utils";
import * as CodecComponents from "@truffle/codec-components/react";
import "@truffle/codec-components/react-styles";
import { createStyles, Flex } from "@mantine/core";

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
  variablesContainer: {
    overflow: "hidden",
    height: "40%",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 4,
    marginBottom: 20,
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][5]
        : `${theme.colors["truffle-beige"][5]}73`
  },
  variables: {
    overflow: "scroll",
    height: "100%",
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors["truffle-brown"][8] : "white"
  },
  variablesContent: {
    paddingLeft: 10
  },
  variablesTypes: {
    fontSize: 12,
    fontWeight: 800
  }
}));

type VariablesArgs = {
  session: Session;
  currentStep: string;
};

function Variables({
  session,
  currentStep
}: VariablesArgs): JSX.Element | null {
  const { classes } = useStyles();
  const [output, setOutput] = useState<JSX.Element[] | null>(null);

  // when the debugger step changes, update variables
  useEffect(() => {
    async function getVariables() {
      const sections = session.view(
        session.selectors.data.current.identifiers.sections
      );
      const variables = await session!.variables();

      const entries = [];
      // section here is a variable category such as a Solidity built-in
      // or contract variable
      for (const section in sections) {
        const variableValues: Array<JSX.Element> = sections[section]
          .map((variableName: keyof typeof variables) => {
            if (variables) {
              return (
                <>
                  <dt>{"  " + variableName}</dt>
                  <dd>
                    <CodecComponents.Result data={variables[variableName]} />
                  </dd>
                </>
              );
            } else {
              return undefined;
            }
          })
          .filter((item: JSX.Element | undefined) => item);
        if (variableValues.length > 0) {
          entries.push(
            <dl key={section}>
              <div className={classes.variablesTypes}>{section}</div>
              {...variableValues}
            </dl>
          );
        }
      }

      setOutput(entries);
    }

    getVariables();
  }, [currentStep, session, classes.variablesTypes]);

  return (
    <Flex direction="column" className={classes.variablesContainer}>
      <div className={classes.sectionHeader}>Variables</div>
      <div className={classes.variables}>
        <pre className={classes.variablesContent}>{output ? output : ""}</pre>
      </div>
    </Flex>
  );
}

export default Variables;
